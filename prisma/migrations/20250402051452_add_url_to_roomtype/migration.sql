/*
  Warnings:

  - Made the column `url` on table `RoomTypeImage` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "RoomTypeImage" ALTER COLUMN "url" SET NOT NULL;
