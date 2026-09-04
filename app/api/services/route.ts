import { NextResponse } from "next/server";
import { ClientSecretCredential } from "@azure/identity";

const dataverseUrl = process.env.DATAVERSE_URL!;
const tenantId = process.env.DATAVERSE_TENANT_ID!;
const clientId = process.env.DATAVERSE_CLIENT_ID!;
const clientSecret = process.env.DATAVERSE_CLIENT_SECRET!;

export async function GET() {
    try {
        const credential = new ClientSecretCredential(
            tenantId,
            clientId,
            clientSecret
        );

        const tokenResponse = await credential.getToken(
            `${dataverseUrl}/.default`
        );

        if (!tokenResponse?.token) {
            throw new Error("Unable to obtain Dataverse access token.");
        }

        const query =
            "?$select=bb_serviceid,bb_name,bb_durationminutes,bb_description,bb_price" +
            "&$filter=statecode eq 0" +
            "&$orderby=bb_name asc";

        const response = await fetch(
            `${dataverseUrl}/api/data/v9.2/bb_services${query}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${tokenResponse.token}`,
                    Accept: "application/json",
                    "OData-Version": "4.0",
                    "OData-MaxVersion": "4.0",
                },
            }
        );

        const responseText = await response.text();

        if (!response.ok) {
            console.error(
                "Dataverse service query error:",
                response.status,
                responseText
            );

            return NextResponse.json(
                {
                    success: false,
                    message: "Unable to load dental services.",
                },
                { status: 500 }
            );
        }

        const result = responseText
            ? JSON.parse(responseText)
            : { value: [] };

        const services = result.value.map((service: any) => ({
            id: service.bb_serviceid,
            name: service.bb_name,
            description: service.bb_description ?? "",
            durationMinutes: service.bb_durationminutes,
            price: service.bb_price ?? 0,
        }));

        return NextResponse.json({
            success: true,
            services,
        });
    } catch (error) {
        console.error("Services API error:", error);

        return NextResponse.json(
            {
                success: false,
                message: "Unable to load dental services.",
            },
            { status: 500 }
        );
    }
}