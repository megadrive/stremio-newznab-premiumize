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

export class PremiumizeError extends Error {}
