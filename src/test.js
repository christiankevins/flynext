const { POST } = require("./app/api/hotel");
const { db } = require("./server/db");
const { NextRequest } = require("next/server");
jest.mock("./server/db");

const mockSession = { id: "user123" }; // Mocked user session

describe("POST /api/hotel", () => {
  let req;

  beforeEach(() => {
    req = {
      json: jest.fn(),
    };
  });

  it("should create a new hotel when valid data is provided", async () => {
    const mockHotelData = {
      name: "Test Hotel",
      address: "123 Street",
      latitude: 40.7128,
      longitude: -74.006,
      starRating: 5,
    };
    req.json.mockResolvedValue(mockHotelData);

    db.hotel.create.mockResolvedValue({
      ...mockHotelData,
      id: "hotel123",
      ownerId: mockSession.id,
    });

    const res = await POST(req, {}, mockSession);
    const jsonResponse = await res.json();

    expect(res.status).toBe(200);
    expect(jsonResponse.newHotel).toMatchObject({
      ...mockHotelData,
      ownerId: mockSession.id,
    });
  });

  it("should return a 500 error when database creation fails", async () => {
    req.json.mockResolvedValue({
      name: "Test Hotel",
      address: "123 Street",
      latitude: 40.7128,
      longitude: -74.006,
      starRating: 5,
    });

    db.hotel.create.mockRejectedValue(new Error("DB Error"));

    const res = await POST(req, {}, mockSession);
    const jsonResponse = await res.json();

    expect(res.status).toBe(500);
    expect(jsonResponse.error).toBe("Failed to add hotel");
  });
});
