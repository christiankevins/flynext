-- DropForeignKey
ALTER TABLE "Availability" DROP CONSTRAINT "Availability_roomId_fkey";

-- DropForeignKey
ALTER TABLE "HotelImage" DROP CONSTRAINT "HotelImage_hotelId_fkey";

-- DropForeignKey
ALTER TABLE "RoomTypeImage" DROP CONSTRAINT "RoomTypeImage_roomId_fkey";

-- AlterTable
ALTER TABLE "RoomTypeImage" ALTER COLUMN "roomId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "HotelImage" ADD CONSTRAINT "HotelImage_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("hotelId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomTypeImage" ADD CONSTRAINT "RoomTypeImage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "RoomType"("roomId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "RoomType"("roomId") ON DELETE CASCADE ON UPDATE CASCADE;
