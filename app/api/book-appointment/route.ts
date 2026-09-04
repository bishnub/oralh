import { NextRequest, NextResponse } from "next/server";
import { ClientSecretCredential } from "@azure/identity";

const dataverseUrl = process.env.DATAVERSE_URL!;
const tenantId = process.env.DATAVERSE_TENANT_ID!;
const clientId = process.env.DATAVERSE_CLIENT_ID!;
const clientSecret = process.env.DATAVERSE_CLIENT_SECRET!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        const {
            serviceId,
            startDateTime,
            firstName,
            lastName,
            email,
            phone,
        } = body;

        if (
            !serviceId ||
            !startDateTime ||
            !firstName ||
            !lastName ||
            !email
        ) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Required booking information is missing.",
                },
                { status: 400 }
            );
        }

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

        const response = await fetch(
            `${dataverseUrl}/api/data/v9.2/bb_BookAppointment`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${tokenResponse.token}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    ServiceId: serviceId,
                    StartDateTime: startDateTime,
                    FirstName: firstName,
                    LastName: lastName,
                    Email: email,
                    Phone: phone ?? "",
                }),
            }
        );

        const responseText = await response.text();

        if (!response.ok) {
            console.error(
                "Dataverse Custom API error:",
                response.status,
                responseText
            );

            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Unable to book the appointment. Please try again.",
                },
                { status: 500 }
            );
        }

        const result = responseText
            ? JSON.parse(responseText)
            : {};

        return NextResponse.json({
            success: true,
            bookingReference: result.BookingReference,
            appointmentId: result.AppointmentId,
            message: result.Message,
        });
    } catch (error) {
        console.error("Booking API error:", error);

        return NextResponse.json(
            {
                success: false,
                message:
                    "An unexpected error occurred while booking the appointment.",
            },
            { status: 500 }
        );
    }
}