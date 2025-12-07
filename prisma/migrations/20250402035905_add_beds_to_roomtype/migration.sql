/*
  Warnings:

  - Added the required column `beds` to the `RoomType` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RoomType" ADD COLUMN     "beds" INTEGER NOT NULL;
