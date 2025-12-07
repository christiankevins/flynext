/*
  Warnings:

  - You are about to drop the column `images` on the `RoomType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RoomType" DROP COLUMN "images";

-- CreateTable
CREATE TABLE "RoomTypeImage" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,

    CONSTRAINT "RoomTypeImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "RoomTypeImage" ADD CONSTRAINT "RoomTypeImage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "RoomType"("roomId") ON DELETE RESTRICT ON UPDATE CASCADE;
