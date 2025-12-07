import { Prisma, PrismaClient } from "@prisma/client";
import { hash } from "argon2";
import { listCities } from "~/app/api/afs";
import puppeteer from "puppeteer";
import { faker } from "@faker-js/faker";
import { geocodeAddressRaw } from "~/utils/geocoding";
import { ensureBuckets, s3 } from "~/server/aws";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { env } from "~/env";
import fetch from "node-fetch";
import sharp from "sharp";
import { availableAmenities } from "~/lib/utils/amenities";

const prisma = new PrismaClient();

function getRandomAmenities(count: number) {
  const shuffled = [...availableAmenities].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);
  return selected.join(", ");
}

function improveGoogleImageUrl(url: string): string {
  // If it's a Google cached image (contains googleusercontent.com)
  if (url.includes("googleusercontent.com")) {
    // Remove any existing size parameters (w253-h189-k-no)
    url = url.replace(/=w\d+-h\d+-k-no/, "");
    // Add parameter for maximum size
    url = url.replace(/=/, "=s0");
  }
  return url;
}

async function uploadImageToS3(
  imageUrl: string,
  imageId: string,
  imageType: "hotel" | "roomType" = "hotel",
): Promise<void> {
  try {
    const response = await fetch(imageUrl);
    const buffer = await response.buffer();

    // Convert image to WebP format with quality optimization
    const webpBuffer = await sharp(buffer)
      .webp({ quality: 100 }) // Adjust quality as needed (0-100)
      .toBuffer();

    const key = `${imageId}.webp`;
    await s3.send(
      new PutObjectCommand({
        Bucket: env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_IMAGES,
        Key: key,
        Body: webpBuffer,
        ContentType: "image/webp",
      }),
    );

    // Update the image URL in the database based on the image type
    if (imageType === "hotel") {
      await prisma.hotelImage.update({
        where: { id: imageId },
        data: {
          url: `${env.NEXT_PUBLIC_MINIO_ENDPOINT}/${env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_IMAGES}/${key}`,
        },
      });
    } else {
      await prisma.roomTypeImage.update({
        where: { id: imageId },
        data: {
          url: `${env.NEXT_PUBLIC_MINIO_ENDPOINT}/${env.NEXT_PUBLIC_MINIO_BUCKET_HOTEL_IMAGES}/${key}`,
        },
      });
    }

    console.log(`Successfully uploaded image to S3 with key: ${key}`);
  } catch (error) {
    console.error(`Error uploading image to S3: ${error}`);
  }
}

async function main() {
  await prisma.cartItem.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.user.deleteMany();

  await ensureBuckets();

  // Create test user
  const hashedPassword = await hash("password123");
  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      passwordHash: hashedPassword,
      firstName: "Test",
      lastName: "User",
      phoneNumber: "+1234567890",
    },
  });

  let cities = await listCities();
  if (!process.argv.includes("--big")) {
    cities = cities.slice(0, 2);
  }
  
  console.log(`Found ${cities.length} cities to scrape`);

  for (const [cityIndex, city] of cities.entries()) {
    console.log(
      `Scraping hotels for ${city.city}, ${city.country} (${cityIndex + 1}/${
        cities.length
      })`,
    );
    await scrapeHotels({
      country: city.country,
      city: city.city,
      ownerId: user.id,
    });
  }

  console.log("Database seeded successfully");
}

async function scrapeHotels({
  country,
  city,
  ownerId,
}: {
  country: string;
  city: string;
  ownerId: string;
}) {
  console.log(`\n=== Starting to scrape hotels for ${city}, ${country} ===`);
  const url = `https://www.google.com/travel/search?q=${encodeURIComponent(
    `${city}, ${country}`,
  )}`;

  const namesSelector =
    ".K1smNd > c-wiz > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > h2:nth-child(1)";

  const linksSelector =
    "#id > c-wiz:nth-child(1) > c-wiz > div:nth-child(1) > a:nth-child(1)";

  const selectPhotosSelector = ".Kn0qT > span:nth-child(5)";

  const imgsSelector =
    ".hLDzN > div > div:nth-child(1) > div:nth-child(1) > img:nth-child(3)";

  const showMoreButtonSelector =
    "section.NgCL1e:nth-child(2) > div:nth-child(3) > div:nth-child(2) > span:nth-child(2)";

  const moreImgsSelector =
    "section.NgCL1e:nth-child(2) > div:nth-child(2) > div > div:nth-child(1) > div:nth-child(1) > img:nth-child(3)";

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    console.log("Creating new page...");
    const page = await browser.newPage();
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: "networkidle0" });

    // Wait for the hotel titles to load
    console.log("Waiting for hotel names to load...");
    await page.waitForSelector(namesSelector);

    // Get all hotel names
    console.log("Extracting hotel names...");
    const names = (
      await page.evaluate((selector) => {
        const nameElements = document.querySelectorAll(selector);
        return Array.from(nameElements).map((el) => el.textContent);
      }, namesSelector)
    ).map((name) => name || faker.company.name());

    // Get all hotel links
    console.log("Extracting hotel links...");
    const links = await page.evaluate((selector) => {
      const linkElements = document.querySelectorAll(selector);
      return Array.from(linkElements).map((el) => el.getAttribute("href"));
    }, linksSelector);

    console.log(`Found ${names.length} hotels to process`);

    for (const [index, name] of names.entries()) {
      console.log(`\nProcessing hotel ${index + 1}/${names.length}: ${name}`);

      // Navigate to hotel page
      const hotelLink = links[index];
      let imageUrls: string[] = [];

      if (hotelLink) {
        const fullHotelLink = `https://google.com${hotelLink}`;
        console.log(`Navigating to hotel page: ${fullHotelLink}`);
        await page.goto(fullHotelLink, { waitUntil: "networkidle0" });

        // Click the photos button
        try {
          console.log("Clicking photos button...");
          await page.waitForSelector(selectPhotosSelector);
          await page.click(selectPhotosSelector);

          // Wait for images to load
          await page.waitForSelector(imgsSelector);

          // Extract image URLs while still on the hotel page
          imageUrls = (
            await page.evaluate((selector) => {
              const imgElements = document.querySelectorAll(selector);
              return Array.from(imgElements).map((el) =>
                el.getAttribute("src"),
              );
            }, imgsSelector)
          )
            .filter((url): url is string => url !== null)
            .slice(0, 8);

          console.log(`Found ${imageUrls.length} images for ${name}:`);

          // Try to click the "Show More" button to get additional images
          try {
            console.log("Attempting to click 'Show More' button...");
            const showMoreButton = await page.$(showMoreButtonSelector);
            if (showMoreButton) {
              await showMoreButton.click();
              console.log("Clicked 'Show More' button successfully");

              // Wait for additional images to load
              await page
                .waitForSelector(moreImgsSelector, { timeout: 5000 })
                .catch(() => {
                  console.log(
                    "No additional images found after clicking 'Show More'",
                  );
                });

              // Extract additional image URLs
              const additionalImageUrls = await page.evaluate((selector) => {
                const imgElements = document.querySelectorAll(selector);
                return Array.from(imgElements).map((el) =>
                  el.getAttribute("src"),
                );
              }, moreImgsSelector);

              // Filter out null values and add to existing imageUrls
              const validAdditionalUrls = additionalImageUrls
                .filter((url): url is string => url !== null)
                .slice(0, 8);

              console.log(
                `Found ${validAdditionalUrls.length} additional images`,
              );
              imageUrls = [...imageUrls, ...validAdditionalUrls];
            } else {
              console.log("'Show More' button not found");
            }
          } catch (error) {
            console.error(
              `Error clicking 'Show More' button for ${name}:`,
              error,
            );
          }
        } catch (error) {
          console.error(`Error clicking photos button for ${name}:`, error);
        }

        // Go back to the search results page
        await page.goto(url, { waitUntil: "networkidle0" });
        await page.waitForSelector(namesSelector);
      }

      console.log(`Geocoding hotel: ${name} in ${city}, ${country}`);

      const result = await geocodeAddressRaw(`${name}, ${city}, ${country}`);
      const province =
        result?.address_components?.find((component: any) =>
          component.types.includes("administrative_area_level_1"),
        )?.long_name ?? faker.location.state();

      const streetNumber =
        result?.address_components?.find((component: any) =>
          component.types.includes("street_number"),
        )?.long_name ?? faker.number.int({ min: 1, max: 9999 });

      const street =
        result?.address_components?.find((component: any) =>
          component.types.includes("route"),
        )?.long_name ?? faker.location.street();

      const postalCode =
        result?.address_components?.find((component: any) =>
          component.types.includes("postal_code"),
        )?.long_name ?? faker.location.zipCode();

      const latitude = result?.geometry?.location?.lat;
      const longitude = result?.geometry?.location?.lng;

      const hotel = await prisma.hotel.create({
        data: {
          name,
          starRating: faker.number.int({ min: 1, max: 5 }),
          ownerId,
          country,
          province,
          city,
          streetAddress: `${streetNumber} ${street}`,
          postalCode,
          latitude,
          longitude,
          amenities: getRandomAmenities(faker.number.int({ min: 1, max: 3 })),
        },
      });

      // Store image URLs in database
      for (const [i, url] of imageUrls.entries()) {
        if (url) {
          const fullUrl = url.startsWith("//") ? `https:${url}` : url;
          const improvedUrl = improveGoogleImageUrl(fullUrl);
          console.log(`Processing image ${i + 1}: ${improvedUrl}`);

          // First create the HotelImage record
          const hotelImage = await prisma.hotelImage.create({
            data: {
              hotelId: hotel.hotelId,
              url: improvedUrl,
            },
          });

          // Then upload to S3 using the image's ID
          await uploadImageToS3(improvedUrl, hotelImage.id, "hotel");
          console.log(`Successfully processed image ${i + 1}`);
        }
      }

      console.log(`Creating room types for hotel: ${name}`);
      const standardRoom = await prisma.roomType.create({
        data: {
          name: "Standard Room",
          pricePerNight: faker.number.int({ min: 80, max: 120 }),
          amenities: getRandomAmenities(faker.number.int({ min: 1, max: 2 })),
          totalRooms: 20,
          beds: 2,
          hotelId: hotel.hotelId,
        },
      });
      const deluxeSuite = await prisma.roomType.create({
        data: {
          name: "Deluxe Suite",
          pricePerNight: faker.number.int({ min: 200, max: 300 }),
          amenities: getRandomAmenities(faker.number.int({ min: 2, max: 3 })),
          totalRooms: 10,
          beds: 3,
          hotelId: hotel.hotelId,
        },
      });
      const executiveSuite = await prisma.roomType.create({
        data: {
          name: "Executive Suite",
          pricePerNight: faker.number.int({ min: 400, max: 600 }),
          amenities: getRandomAmenities(faker.number.int({ min: 3, max: 4 })),
          totalRooms: 5,
          beds: 4,
          hotelId: hotel.hotelId,
        },
      });
      const presidentialPenthouse = await prisma.roomType.create({
        data: {
          name: "Presidential Penthouse",
          pricePerNight: faker.number.int({ min: 800, max: 1200 }),
          amenities: getRandomAmenities(faker.number.int({ min: 4, max: 5 })),
          totalRooms: 1,
          beds: 6,
          hotelId: hotel.hotelId,
        },
      });

      // Create RoomTypeImage records for each room type
      const roomTypes = [
        standardRoom,
        deluxeSuite,
        executiveSuite,
        presidentialPenthouse,
      ];

      // Filter out empty URLs and ensure we have enough images
      const validImageUrls = imageUrls.filter(
        (url) => url && url.trim() !== "",
      );

      for (const roomType of roomTypes) {
        console.log(`Creating images for room type: ${roomType.name}`);

        // Get 2 random images for this room type
        const roomTypeImages = [...validImageUrls]
          .sort(() => 0.5 - Math.random())
          .slice(0, 2);

        for (const [i, url] of roomTypeImages.entries()) {
          if (url) {
            const fullUrl = url.startsWith("//") ? `https:${url}` : url;
            const improvedUrl = improveGoogleImageUrl(fullUrl);
            console.log(`Processing room type image ${i + 1}: ${improvedUrl}`);

            // Create the RoomTypeImage record
            const roomTypeImage = await prisma.roomTypeImage.create({
              data: {
                roomId: roomType.roomId,
                url: improvedUrl,
              },
            });

            // Upload to S3 using the image's ID
            await uploadImageToS3(improvedUrl, roomTypeImage.id, "roomType");
            console.log(`Successfully processed room type image ${i + 1}`);
          }
        }
      }

      console.log(`Successfully processed hotel: ${name}`);
      // Add a small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log(
      `=== Successfully completed scraping for ${city}, ${country} ===\n`,
    );
  } catch (error) {
    console.error(`\n❌ Error scraping hotels for ${city}, ${country}:`, error);
  } finally {
    console.log("Closing browser...");
    await browser.close();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
