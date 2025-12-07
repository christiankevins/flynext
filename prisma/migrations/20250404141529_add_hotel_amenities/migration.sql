/*
  Warnings:

  - Added the required column `amenities` to the `Hotel` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Hotel" ADD COLUMN     "amenities" TEXT NOT NULL;
