import { video_filetypes } from "../consts";
import { env } from "../env";
import { retryAsyncUntilTruthy } from "ts-retry";

export type PremiumizeAPI_TransferCreate = {
  status: string;
  id: string;
  name: string;
  type: string;
};

export type PremiumizeAPI_TransferList = {
  status: string;
  transfers: {
    id: string;
    name: string;
    status: string;
    progress: number;
    src: string;
    folder_id: string;
    file_id: string;
  }[];
};

export type PremiumizeAPI_DirectDL = {
  status: string;
  location: string;
  filename: string;
  filesize: number;
  content: {
    path: string;
    size: number;
    link: string;
    stream_link: string;
    transcode_status: string;
  }[];
};

export type PremiumizeAPI_FolderSearch = {
  status: string;
  content: {
    id: string;
    name: string;
    type: string;
    size: number;
    created_at: number;
    mime_type: string;
    transcode_status: string;
    link: string;
    stream_link: string;
    virus_scan: string;
  }[];
  name: string;
  parent_id: string;
  breadcrumbs: string;
};

export type PremiumizeAPI_FolderCreate = {
  status: string;
  id: string;
};

export type PremiumizeAPI_FolderList = {
  status: string;
  content: {
    id: string;
    name: string;
    type: string;
    size: number;
    created_at: number;
    mime_type: string;
    transcode_status: string;
    link: string;
    stream_link: string;
    virus_scan: string;
  }[];
  breadcrumbs: {
    id: string;
    name: string;
    parent_id: string;
  }[];
  name: string;
  parent_id: string;
  folder_id: string;
};

class PremiumizeError extends Error {}

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

  return transfer.status === "finished";
};

const waitForTransferCompletion = async (filename: string, apikey: string) => {
  const result = await retryAsyncUntilTruthy<boolean>(
    () => queryTransferCompletion(filename, apikey),
    {
      maxTry: 30,
      delay: 3000,
    }
  );

  return result;
};

/**
 * Moves the file to the configured folder as NZBs are weird.
 */
const moveTransferAfterCompletion = async (
  filename: string,
  apikey: string
) => {
  console.log(`searching for ${filename}`);
  const folder = (await api(
    `/folder/search?q=${filename}`,
    apikey
  )) as PremiumizeAPI_FolderList;

  const folder_contents = (await api(
    `/folder/list?id=${folder.content[0].id}`,
    apikey
  )) as PremiumizeAPI_FolderList;

  const file = folder_contents.content.find((f) => {
    const file_type = f.name.split(".").at(-1);
    console.log({ f, file_type });
    if (!file_type) return false;
    return video_filetypes.includes(file_type);
  });
  console.log({ file });

  if (!file) throw new PremiumizeError(`No movie file for ${filename}`);
  const filetype = file.name.split(".").at(-1);
  const filename_split = filename.split(".");
  filename_split.pop();
  const new_filename = filename_split.join(".") + `.${filetype}`;

  const rename_body = new URLSearchParams();
  rename_body.append("id", file.id);
  rename_body.append("name", new_filename);

  const renamed_file = await api("/item/rename", apikey, {
    method: "post",
    body: rename_body,
  });

  return {
    ...file,
    name: new_filename,
  };
};

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
  moveTransferAfterCompletion,
  waitForTransferCompletion,
};