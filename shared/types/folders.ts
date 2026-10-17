export interface Folder {
  path: string;
  exists: boolean;
}

export interface PickedFolder {
  // null when the person closed the picker without choosing
  path: string | null;
}
