import { NextResponse } from "next/server";
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
  const tokenResponse = await credential.getToken(
    `${dataverseUrl}/.default`
  );

  if (!tokenResponse?.token) {
    throw new Error("Unable to acquire Dataverse access token.");
  }

  return tokenResponse.token;
}

async function dataverseGet(query: string) {
  const token = await getAccessToken();

  const response = await fetch(
    `${dataverseUrl}/api/data/v9.2/${query}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "OData-Version": "4.0",
        "OData-MaxVersion": "4.0",
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Dataverse request failed: ${response.status} ${errorText}`
    );
  }

  return response.json();
}

export async function GET() {
  try {
    const resourceQuery =
      `bb_resources` +
      `?$select=bb_resourceid,bb_name,bb_speciality,bb_image` +
      `&$filter=statecode eq 0 and bb_type eq 1`;

    const data = await dataverseGet(resourceQuery);

    const resources = (data.value ?? []).map((resource: any) => ({
      id: resource.bb_resourceid,
      name: resource.bb_name,
      speciality: resource.bb_speciality,
      image: resource.bb_image
        ? `data:image/jpeg;base64,${resource.bb_image}`
        : null,
    }));

    return NextResponse.json({
      resources,
    });
  } catch (error) {
    console.error("Error retrieving resources:", error);

    return NextResponse.json(
      {
        error: "Unable to retrieve resources.",
      },
      {
        status: 500,
      }
    );
  }
}