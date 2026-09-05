import { NextRequest, NextResponse } from "next/server";
import { ClientSecretCredential } from "@azure/identity";

const dataverseUrl = process.env.DATAVERSE_URL!;
const tenantId = process.env.DATAVERSE_TENANT_ID!;
const clientId = process.env.DATAVERSE_CLIENT_ID!;
const clientSecret = process.env.DATAVERSE_CLIENT_SECRET!;

const credential = new ClientSecretCredential(
  tenantId,
  clientId,
  clientSecret
);

async function getAccessToken(): Promise<string> {
  const token = await credential.getToken(
    `${dataverseUrl}/.default`
  );

  if (!token?.token) {
    throw new Error(
      "Unable to obtain Dataverse access token."
    );
  }

  return token.token;
}

export async function GET(
  request: NextRequest
) {
  try {
    // ---------------------------------------------------------
    // 1. Read query parameters
    // ---------------------------------------------------------

    const { searchParams } =
      new URL(request.url);

    const serviceId =
      searchParams.get("serviceId");

    const date =
      searchParams.get("date");

    if (!serviceId || !date) {
      return NextResponse.json(
        {
          error:
            "serviceId and date are required.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 2. Validate date
    // ---------------------------------------------------------

    const requestedDate =
      new Date(`${date}T00:00:00`);

    if (
      Number.isNaN(
        requestedDate.getTime()
      )
    ) {
      return NextResponse.json(
        {
          error: "Invalid date.",
        },
        { status: 400 }
      );
    }

    // ---------------------------------------------------------
    // 3. Get Dataverse access token
    // ---------------------------------------------------------

    const accessToken =
      await getAccessToken();

    // ---------------------------------------------------------
    // 4. Call Dataverse Custom API
    // ---------------------------------------------------------

    const customApiUrl =
      `${dataverseUrl}/api/data/v9.2/bb_GetAvailableSlots`;

    const response =
      await fetch(
        customApiUrl,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            Accept:
              "application/json",

            "Content-Type":
              "application/json",

            "OData-MaxVersion":
              "4.0",

            "OData-Version":
              "4.0",
          },

          body: JSON.stringify({
            ServiceId: serviceId,

            StartDate:
              `${date}T00:00:00Z`,
          }),

          cache: "no-store",
        }
      );

    // ---------------------------------------------------------
    // 5. Handle Dataverse error
    // ---------------------------------------------------------

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "GetAvailableSlots Custom API failed:",
        response.status,
        errorText
      );

      return NextResponse.json(
        {
          error:
            "Unable to retrieve available slots.",
        },
        {
          status: response.status,
        }
      );
    }

    // ---------------------------------------------------------
    // 6. Read Custom API response
    // ---------------------------------------------------------

    const result =
      await response.json();

    // ---------------------------------------------------------
    // 7. Parse Slots JSON
    // ---------------------------------------------------------

    let slots: {
      start: string;
      end: string;
    }[] = [];

    if (result.Slots) {
      try {
        slots =
          JSON.parse(result.Slots);
      } catch (parseError) {
        console.error(
          "Unable to parse Slots response:",
          parseError
        );

        return NextResponse.json(
          {
            error:
              "Invalid availability response from Dataverse.",
          },
          {
            status: 500,
          }
        );
      }
    }

    // ---------------------------------------------------------
    // 8. Return response to browser
    // ---------------------------------------------------------

    return NextResponse.json(
      {
        date,
        serviceId,
        slots,
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error(
      "Availability API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to retrieve availability.",
      },
      {
        status: 500,

        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  }
}