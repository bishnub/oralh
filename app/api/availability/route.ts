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

type AvailabilityRecord = {
  bb_starttime: string;
  bb_endtime: string;
};

type AppointmentRecord = {
  activityid: string;
  scheduledstart: string;
  scheduledend: string;
};

async function getAccessToken(): Promise<string> {
  const token = await credential.getToken(
    `${dataverseUrl}/.default`
  );

  if (!token?.token) {
    throw new Error("Unable to obtain Dataverse access token.");
  }

  return token.token;
}

async function dataverseGet(
  path: string,
  accessToken: string
): Promise<any> {
  const response = await fetch(
    `${dataverseUrl}/api/data/v9.2/${path}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "OData-MaxVersion": "4.0",
        "OData-Version": "4.0",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Dataverse request failed (${response.status}): ${errorText}`
    );
  }

  return response.json();
}

/*
 * Get timezone offset for a specific date/time.
 */
function getTimeZoneOffsetMs(
  date: Date,
  timeZone: string
): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values: Record<string, number> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = Number(part.value);
    }
  }

  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second
  );

  return asUtc - date.getTime();
}

/*
 * Convert Hamburg/Europe-Berlin local date/time to UTC.
 *
 * Example in summer:
 *
 * 2026-09-04 16:00 Europe/Berlin
 * becomes
 * 2026-09-04T14:00:00.000Z
 */
function hamburgLocalToUtc(
  date: string,
  time: string
): Date {
  const [hours, minutes] = time
    .split(":")
    .map(Number);

  const localAsUtc = Date.UTC(
    Number(date.substring(0, 4)),
    Number(date.substring(5, 7)) - 1,
    Number(date.substring(8, 10)),
    hours,
    minutes,
    0
  );

  let utcTimestamp = localAsUtc;

  /*
   * Two iterations are enough for normal DST transitions.
   */
  for (let i = 0; i < 2; i++) {
    const offset = getTimeZoneOffsetMs(
      new Date(utcTimestamp),
      "Europe/Berlin"
    );

    utcTimestamp = localAsUtc - offset;
  }

  return new Date(utcTimestamp);
}

export async function GET(
  request: NextRequest
) {
  try {
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

    /*
     * ---------------------------------------------------------
     * 1. Validate date
     * ---------------------------------------------------------
     */

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

    /*
     * ---------------------------------------------------------
     * 2. Get Dataverse access token
     * ---------------------------------------------------------
     */

    const accessToken =
      await getAccessToken();

    /*
     * ---------------------------------------------------------
     * 3. Get service duration
     * ---------------------------------------------------------
     */

    const serviceQuery =
      `bb_services(${serviceId})` +
      `?$select=bb_serviceid,bb_name,bb_durationminutes` +
      `&$filter=statecode eq 0`;

    const service =
      await dataverseGet(
        serviceQuery,
        accessToken
      );

    if (!service) {
      return NextResponse.json(
        {
          error: "Service not found.",
        },
        { status: 404 }
      );
    }

    const durationMinutes =
      Number(
        service.bb_durationminutes
      );

    if (
      !durationMinutes ||
      durationMinutes <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Service duration is not configured.",
        },
        { status: 400 }
      );
    }

    console.log(
      "SERVICE INFORMATION:",
      {
        serviceId,
        serviceName:
          service.bb_name,
        durationMinutes,
        date,
      }
    );

    /*
     * ---------------------------------------------------------
     * 4. Determine day of week
     * ---------------------------------------------------------
     *
     * JavaScript:
     *
     * Sunday    = 0
     * Monday    = 1
     * Tuesday   = 2
     * Wednesday = 3
     * Thursday  = 4
     * Friday    = 5
     * Saturday  = 6
     *
     * These values match your current
     * bb_dayofweek configuration.
     */

    const jsDay =
      requestedDate.getDay();

    const DAY_OPTION_VALUES:
      Record<number, number> = {
        0: 0, // Sunday
        1: 1, // Monday
        2: 2, // Tuesday
        3: 3, // Wednesday
        4: 4, // Thursday
        5: 5, // Friday
        6: 6, // Saturday
      };

    const dayOptionValue =
      DAY_OPTION_VALUES[jsDay];

    console.log(
      "DAY INFORMATION:",
      {
        date,
        jsDay,
        dayOptionValue,
      }
    );

    /*
     * ---------------------------------------------------------
     * 5. Get resources that can provide this service
     * ---------------------------------------------------------
     *
     * N:N intersect table:
     *
     * bb_bb_service_bb_resource
     *
     * Web API entity set:
     *
     * bb_bb_service_bb_resourceset
     *
     * Columns:
     *
     * bb_serviceid
     * bb_resourceid
     */

    const intersectQuery =
      `bb_bb_service_bb_resourceset` +
      `?$select=bb_serviceid,bb_resourceid` +
      `&$filter=bb_serviceid eq ${serviceId}`;

    const relationships =
      await dataverseGet(
        intersectQuery,
        accessToken
      );

    const resourceIds: string[] =
      (relationships.value ?? [])
        .map(
          (record: any) =>
            record.bb_resourceid
        )
        .filter(Boolean);

    /*
     * IMPORTANT DEBUG LOG
     *
     * This tells us exactly how many resources
     * are linked to the selected service.
     */

    console.log(
      "SERVICE RESOURCE IDS:",
      {
        serviceId,
        resourceIds,
        resourceCount:
          resourceIds.length,
      }
    );

    if (resourceIds.length === 0) {
      console.log(
        "NO RESOURCES FOUND FOR SERVICE."
      );

      return NextResponse.json(
        {
          date,
          serviceId,
          durationMinutes,
          slots: [],
        },
        {
          headers: {
            "Cache-Control":
              "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    /*
     * ---------------------------------------------------------
     * 6. Generate candidate slots
     * ---------------------------------------------------------
     */

    const slotCandidates: {
      resourceId: string;
      start: string;
      end: string;
      startDateTime: Date;
      endDateTime: Date;
    }[] = [];

    for (
      const resourceId of resourceIds
    ) {
      /*
       * Get resource availability
       * for this weekday.
       */

      const availabilityQuery =
        `bb_availabilities` +
        `?$select=bb_starttime,bb_endtime` +
        `&$filter=` +
        `_bb_resource_value eq ${resourceId}` +
        ` and bb_dayofweek eq ${dayOptionValue}` +
        ` and statecode eq 0`;

      console.log(
        "AVAILABILITY QUERY:",
        {
          resourceId,
          availabilityQuery,
        }
      );

      const availabilityResult =
        await dataverseGet(
          availabilityQuery,
          accessToken
        );

      const availabilityRecords:
        AvailabilityRecord[] =
        availabilityResult.value ?? [];

      console.log(
        "AVAILABILITY RECORDS:",
        {
          resourceId,
          count:
            availabilityRecords.length,
          records:
            availabilityRecords,
        }
      );

      /*
       * Generate slots for every
       * availability period.
       */

      for (
        const availability
        of availabilityRecords
      ) {
        const startTime =
          new Date(
            availability.bb_starttime
          );

        const endTime =
          new Date(
            availability.bb_endtime
          );

        /*
         * IMPORTANT:
         *
         * Availability DateTime values are
         * currently being treated as clinic
         * clock time.
         *
         * Therefore use getHours()/getMinutes()
         * rather than getUTCHours().
         */

        let currentMinutes =
          startTime.getHours() * 60 +
          startTime.getMinutes();

        const availabilityEndMinutes =
          endTime.getHours() * 60 +
          endTime.getMinutes();

        console.log(
          "AVAILABILITY PERIOD:",
          {
            resourceId,
            startTime:
              startTime.toString(),
            endTime:
              endTime.toString(),
            currentMinutes,
            availabilityEndMinutes,
          }
        );

        /*
         * Generate slots every 30 minutes.
         */

        while (
          currentMinutes +
            durationMinutes <=
          availabilityEndMinutes
        ) {
          const startHour =
            Math.floor(
              currentMinutes / 60
            );

          const startMinute =
            currentMinutes % 60;

          const endMinutes =
            currentMinutes +
            durationMinutes;

          const endHour =
            Math.floor(
              endMinutes / 60
            );

          const endMinute =
            endMinutes % 60;

          const startText =
            `${String(startHour).padStart(
              2,
              "0"
            )}:${String(
              startMinute
            ).padStart(2, "0")}`;

          const endText =
            `${String(endHour).padStart(
              2,
              "0"
            )}:${String(
              endMinute
            ).padStart(2, "0")}`;

          /*
           * Convert clinic local time
           * to UTC.
           */

          const startDateTime =
            hamburgLocalToUtc(
              date,
              startText
            );

          const endDateTime =
            hamburgLocalToUtc(
              date,
              endText
            );

          const startUtc =
            startDateTime.toISOString();

          const endUtc =
            endDateTime.toISOString();

          console.log(
            "GENERATED SLOT:",
            {
              resourceId,
              startText,
              endText,
              startUtc,
              endUtc,
            }
          );

          slotCandidates.push({
            resourceId,

            start: startUtc,

            end: endUtc,

            startDateTime,

            endDateTime,
          });

          /*
           * 30-minute booking increments.
           */

          currentMinutes += 30;
        }
      }
    }

    console.log(
      "TOTAL SLOT CANDIDATES:",
      {
        count:
          slotCandidates.length,
        slots:
          slotCandidates.map(
            (slot) => ({
              resourceId:
                slot.resourceId,
              start:
                slot.start,
              end:
                slot.end,
            })
          ),
      }
    );

    /*
     * ---------------------------------------------------------
     * 7. Remove slots that conflict with appointments
     * ---------------------------------------------------------
     */

    const availableSlots: {
      start: string;
      end: string;
    }[] = [];

    for (
      const slot of slotCandidates
    ) {
      const startUtc =
        slot.startDateTime.toISOString();

      const endUtc =
        slot.endDateTime.toISOString();

      /*
       * Overlap rule:
       *
       * Existing appointment starts BEFORE
       * the candidate slot ends
       *
       * AND
       *
       * Existing appointment ends AFTER
       * the candidate slot starts.
       *
       * Example:
       *
       * Appointment:
       * 14:00 - 14:45
       *
       * Slot:
       * 14:00 - 14:30
       *
       * 14:00 < 14:30  => true
       * 14:45 > 14:00  => true
       *
       * Therefore conflict exists.
       */

      const appointmentQuery =
        `appointments` +
        `?$select=activityid,scheduledstart,scheduledend` +
        `&$filter=` +
        `scheduledstart lt ${endUtc}` +
        ` and scheduledend gt ${startUtc}` +
        ` and _bb_resource_value eq ${slot.resourceId}` +
        ` and statecode ne 2`;

      console.log(
        "CHECKING SLOT:",
        {
          resourceId:
            slot.resourceId,
          startUtc,
          endUtc,
          appointmentQuery,
        }
      );

      const appointmentsResult =
        await dataverseGet(
          appointmentQuery,
          accessToken
        );

      const appointments:
        AppointmentRecord[] =
        appointmentsResult.value ?? [];

      console.log(
        "APPOINTMENT CONFLICT RESULT:",
        {
          resourceId:
            slot.resourceId,

          startUtc,

          endUtc,

          count:
            appointments.length,

          appointments:
            appointments.map(
              (appointment) => ({
                id:
                  appointment.activityid,

                start:
                  appointment.scheduledstart,

                end:
                  appointment.scheduledend,
              })
            ),
        }
      );

      /*
       * If there is at least one overlapping
       * appointment, this slot is blocked.
       *
       * IMPORTANT:
       *
       * continue prevents the slot from
       * being added to availableSlots.
       */

      if (
        appointments.length > 0
      ) {
        console.log(
          "BLOCKED SLOT:",
          {
            resourceId:
              slot.resourceId,
            startUtc,
            endUtc,
          }
        );

        continue;
      }

      /*
       * No conflicting appointment.
       * Therefore this slot is available.
       */

      console.log(
        "AVAILABLE SLOT:",
        {
          resourceId:
            slot.resourceId,
          startUtc,
          endUtc,
        }
      );

      availableSlots.push({
        start: slot.start,
        end: slot.end,
      });
    }

    /*
     * ---------------------------------------------------------
     * 8. Log available slots before deduplication
     * ---------------------------------------------------------
     */

    console.log(
      "AVAILABLE SLOTS BEFORE DEDUP:",
      {
        count:
          availableSlots.length,
        slots:
          availableSlots,
      }
    );

    /*
     * ---------------------------------------------------------
     * 9. Remove duplicate slots
     * ---------------------------------------------------------
     *
     * If multiple resources can provide the
     * same service, the same time can appear
     * multiple times.
     *
     * We only return the time once.
     */

    const uniqueSlots =
      Array.from(
        new Map(
          availableSlots.map(
            (slot) => [
              `${slot.start}-${slot.end}`,
              slot,
            ]
          )
        ).values()
      );

    /*
     * Sort slots chronologically.
     */

    uniqueSlots.sort(
      (a, b) =>
        a.start.localeCompare(
          b.start
        )
    );

    /*
     * ---------------------------------------------------------
     * 10. Log final result
     * ---------------------------------------------------------
     */

    console.log(
      "FINAL UNIQUE SLOTS:",
      {
        count:
          uniqueSlots.length,
        slots:
          uniqueSlots,
      }
    );

    /*
     * ---------------------------------------------------------
     * 11. Return response
     * ---------------------------------------------------------
     */

    return NextResponse.json(
      {
        date,
        serviceId,
        durationMinutes,
        slots:
          uniqueSlots,
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
