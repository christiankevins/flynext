/*
  Warnings:

  - You are about to drop the column `images` on the `Hotel` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Hotel" DROP COLUMN "images";

-- CreateTable
CREATE TABLE "HotelImage" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT,

    CONSTRAINT "HotelImage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HotelImage" ADD CONSTRAINT "HotelImage_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("hotelId") ON DELETE SET NULL ON UPDATE CASCADE;
