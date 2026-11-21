export type RemovalPhotoState = {
  indexStatus: string;
  faceCount: number;
};

/** Only a fully indexed, single-face source can be removed by a guest. */
export function guestCanRemoveOriginal(photo: RemovalPhotoState): boolean {
  return photo.indexStatus === "indexed" && photo.faceCount === 1;
}
