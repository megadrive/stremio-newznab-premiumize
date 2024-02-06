import { video_filetypes } from "../consts";
import { env } from "../env";
import { retryAsync, retryAsyncUntilTruthy } from "ts-retry";
import {
  PremiumizeAPI_FolderList,
  PremiumizeError,
  PremiumizeAPI_TransferList,
  PremiumizeAPI_FolderSearch,
  PremiumizeAPI_FolderCreate,
} from "./premiumize.types";

const api = async (
  path: string,
  apikey: string,
  opts?: Parameters<typeof fetch>["1"]
) => {
  const url_to_fetch = new URL(
    `${env.PREMIUMIZE_API_BASEURL}/${path}`.replace(/\/+/g, "/")
  );
  url_to_fetch.searchParams.append("apikey", apikey);
  console.log(
    `[premiumize] [${opts?.method ?? "get"}] fetching ${url_to_fetch}`
  );
  if (opts?.method === "post") console.log(opts.body);
  return await (await fetch(url_to_fetch, opts)).json();
};

const listTransfers = (apikey: string) => {
  return api("/transfer/list", apikey);
};

const createTransfer = async (url: string, apikey: string) => {
  const body = new URLSearchParams();
  body.append("src", url);
  // body.append("folder_id", folder_id);

  return api("/transfer/create", apikey, {
    method: "post",
    body,
  });
};

// Check if the user has the file already in their cloud.
const cacheCheck = async (filename: string, apikey: string) => {
  return api(`/cache/check?q=${filename}`, apikey);
};

const getFile = async (id: string, apikey: string) => {
  console.log(`Getting file: ${id}`);

  const files = (await api(
    `/folder/list?id=${id}`,
    apikey
  )) as PremiumizeAPI_FolderList;

  console.log(files);

  const videos = files.content.filter((file) => {
    if (file.type === "folder") return false;
    const filetype = file.name.split(".").at(-1);
    if (!filetype) return false;

    return video_filetypes.includes(filetype);
  });

  if (videos.length === 0) {
    return null;
  }

  return videos[0];
};

const findFiles = async (filename: string, apikey: string) => {
  /*
    Possibilities:
    /Folder
      /File.mp4

    /Folder
      .../
      /File S01 E01.mp4
      /File S01 E02.mp4
    
    /File S01 E01.mp4
   */

  console.log(`searching for ${filename}`);

  let files: PremiumizeAPI_FolderList["content"] = [];

  const folder = (await api(
    `/folder/search?q=${filename}`,
    apikey
  )) as PremiumizeAPI_FolderList;

  if (folder.content.length === 0) {
    throw new PremiumizeError("No found content.");
  }

  const filtered_files = folder.content.filter((item) => item.type === "file");
  files = [...files, ...filtered_files];
  const filtered_folders = folder.content.filter(
    (item) => item.type === "folder"
  );

  console.log({ folder });

  const folder_files = await Promise.all(
    filtered_folders.map(async (filtered_folder) => {
      const folder_contents = (await api(
        `/folder/list?id=${filtered_folder.id}`,
        apikey
      )) as PremiumizeAPI_FolderList;

      const file = folder_contents.content.find((f) => {
        const file_type = f.name.split(".").at(-1);
        console.log({ f, file_type });
        if (!file_type) return false;
        return video_filetypes.includes(file_type);
      });

      if (!file) return undefined;

      file.name = filename;

      return file;
    })
  );

  files = [...files, ...filtered_files];

  return files;
};

const queryTransferCompletion = async (filename: string, apikey: string) => {
  console.log(`checking transfer status of ${filename}`);
  const transferList = (await api(
    "/transfer/list",
    apikey
  )) as PremiumizeAPI_TransferList;

  const transfer = transferList.transfers.find((transfer) =>
    transfer.name.includes(filename)
  );

  console.log({ transfer });

  if (!transfer)
    throw new PremiumizeError(`Couldn't find transfer: ${filename}`);

  return transfer;
};

const waitForTransferCompletion = async (filename: string, apikey: string) => {
  try {
    const timeout = 1000 * 60 * 10; // 10 minutes
    const attempts = Math.ceil(timeout / 5000); // 5 seconds delay between attempts
    const result = await retryAsync<
      Awaited<ReturnType<typeof queryTransferCompletion>>
    >(() => queryTransferCompletion(filename, apikey), {
      maxTry: attempts,
      delay: 5000,
      until: (
        last_result: Awaited<ReturnType<typeof queryTransferCompletion>>
      ) => {
        if (last_result === null) return false;
        if (last_result.status === "error") return false;
        if (last_result.file_id || last_result.folder_id) return true;
        if (last_result.status === "success") return true;

        return false;
      },
    });

    return result;
  } catch (error) {
    console.log(error);
    return null;
  }
};

/**
 * Moves the file to the configured folder as NZBs are weird.
 */
// const moveTransferAfterCompletion = async (
//   filename: string,
//   apikey: string
// ) => {
//   console.log(`searching for ${filename}`);
//   const folder = (await api(
//     `/folder/search?q=${filename}`,
//     apikey
//   )) as PremiumizeAPI_FolderList;

//   const folder_contents = (await api(
//     `/folder/list?id=${folder.content[0].id}`,
//     apikey
//   )) as PremiumizeAPI_FolderList;

//   const file = folder_contents.content.find((f) => {
//     const file_type = f.name.split(".").at(-1);
//     console.log({ f, file_type });
//     if (!file_type) return false;
//     return video_filetypes.includes(file_type);
//   });
//   console.log({ file });

//   if (!file) throw new PremiumizeError(`No movie file for ${filename}`);
//   const filetype = file.name.split(".").at(-1);
//   const filename_split = filename.split(".");
//   filename_split.pop();
//   const new_filename = filename_split.join(".") + `.${filetype}`;

//   const rename_body = new URLSearchParams();
//   rename_body.append("id", file.id);
//   rename_body.append("name", new_filename);

//   const renamed_file = await api("/item/rename", apikey, {
//     method: "post",
//     body: rename_body,
//   });

//   return {
//     ...file,
//     name: new_filename,
//   };
// };

const deleteTransfer = (transfer_id: string, apikey: string) => {
  const body = new URLSearchParams();
  body.append("id", transfer_id);

  return api("/transfer/delete", apikey, {
    method: "post",
    body,
  });
};

const get_or_set_folder = async (
  folder_name = env.PREMIUMIZE_API_FOLDER,
  apikey: string,
  parent_id?: string
) => {
  const folders = (await api(
    `/folder/search?q=${folder_name}`,
    apikey
  )) as PremiumizeAPI_FolderSearch;

  if (folders.content.length === 0) {
    const create_body = new URLSearchParams();
    create_body.append("name", folder_name);
    if (parent_id) {
      create_body.append("parent_id", parent_id);
    }

    const created = (await api(`/folder/create`, apikey, {
      method: "post",
      body: create_body,
    })) as PremiumizeAPI_FolderCreate;

    return created.id;
  }

  return folders.content[0].id;
};

export const premiumize_api = {
  createTransfer,
  deleteTransfer,
  listTransfers,
  // moveTransferAfterCompletion,
  waitForTransferCompletion,

  getFile,
  findFiles,
};
