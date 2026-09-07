"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  Phone,
  User,
} from "lucide-react";

type Service = {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  dataverseId: string;
  durationMinutes: number;
};

type AvailableSlot = {
  start: string;
  end: string;
};

type AvailableDate = {
  date: string;
  label: string;
  weekday: string;
  slots: AvailableSlot[];
};

type BookingResult = {
  bookingReference: string;
  appointmentId: string;
  message: string;
};

export default function BookPage() {
  /*
   * ---------------------------------------------------------
   * Booking state
   * ---------------------------------------------------------
   */

  const [step, setStep] = useState(1);

  const [selectedService, setSelectedService] =
    useState<Service | null>(null);

  const [selectedDate, setSelectedDate] =
    useState<AvailableDate | null>(null);

  const [selectedTime, setSelectedTime] =
    useState<string | null>(null);

  /*
   * ---------------------------------------------------------
   * Services
   * ---------------------------------------------------------
   */

  const [services, setServices] = useState<Service[]>([]);
  const [isLoadingServices, setIsLoadingServices] =
    useState(true);
  const [servicesError, setServicesError] =
    useState<string | null>(null);

  /*
   * ---------------------------------------------------------
   * Availability
   * ---------------------------------------------------------
   */

  const [availableDates, setAvailableDates] =
    useState<AvailableDate[]>([]);

  const [availableSlots, setAvailableSlots] =
    useState<AvailableSlot[]>([]);

  const [isLoadingDates, setIsLoadingDates] =
    useState(false);

  const [isLoadingSlots, setIsLoadingSlots] =
    useState(false);

  const [availabilityError, setAvailabilityError] =
    useState<string | null>(null);

  /*
   * ---------------------------------------------------------
   * Patient details
   * ---------------------------------------------------------
   */

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  /*
   * ---------------------------------------------------------
   * Booking submission
   * ---------------------------------------------------------
   */

  const [isBooking, setIsBooking] = useState(false);
  const [bookingError, setBookingError] =
    useState<string | null>(null);

  const [bookingResult, setBookingResult] =
    useState<BookingResult | null>(null);

  /*
   * ---------------------------------------------------------
   * Load services
   * ---------------------------------------------------------
   */

  useEffect(() => {
    async function loadServices() {
      try {
        setIsLoadingServices(true);
        setServicesError(null);

        const response = await fetch("/api/services", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            "Unable to load dental services."
          );
        }

        const result = await response.json();

        const mappedServices: Service[] =
          result.services.map(
            (service: {
              id: string;
              name: string;
              description: string;
              durationMinutes: number;
              price: number;
            }) => ({
              id: service.id,
              dataverseId: service.id,
              name: service.name,
              description:
                service.description ?? "",
              duration: `${service.durationMinutes} min`,
              price: service.price ?? 0,
              durationMinutes:
                service.durationMinutes,
            })
          );

        setServices(mappedServices);
      } catch (error) {
        console.error(
          "Error loading services:",
          error
        );

        setServicesError(
          "Unable to load available dental services."
        );
      } finally {
        setIsLoadingServices(false);
      }
    }

    loadServices();
  }, []);

  /*
   * ---------------------------------------------------------
   * Generate next dates
   * ---------------------------------------------------------
   */

  function getNextDates(days: number): string[] {
    const dates: string[] = [];

    const today = new Date();

    for (let i = 0; i < days; i++) {
      const date = new Date(today);

      date.setDate(today.getDate() + i);

      const year = date.getFullYear();
      const month = String(
        date.getMonth() + 1
      ).padStart(2, "0");

      const day = String(
        date.getDate()
      ).padStart(2, "0");

      dates.push(
        `${year}-${month}-${day}`
      );
    }

    return dates;
  }

  /*
   * ---------------------------------------------------------
   * Load available dates when service changes
   * ---------------------------------------------------------
   */

useEffect(() => {
  if (!selectedService) {
    setAvailableDates([]);
    setAvailableSlots([]);
    return;
  }

  const serviceId = selectedService.id;

  async function loadAvailableDates() {
    try {
      setIsLoadingDates(true);
      setAvailabilityError(null);

      setSelectedDate(null);
      setSelectedTime(null);
      setAvailableSlots([]);

      const dates = getNextDates(14);

      const results = await Promise.all(
        dates.map(async (date) => {
          const response = await fetch(
            `/api/availability?serviceId=${encodeURIComponent(
              serviceId
            )}&date=${encodeURIComponent(date)}`,
            {
              cache: "no-store",
            }
          );

          if (!response.ok) {
            throw new Error(
              "Unable to load availability."
            );
          }

          const data = await response.json();

          return {
            date,
            slots: data.slots ?? [],
          };
        })
      );

      const available: AvailableDate[] =
        results
          .filter(
            (result) => result.slots.length > 0
          )
          .map((result) => {
            const date = new Date(
              `${result.date}T00:00:00`
            );

            return {
              date: result.date,
              label: date.toLocaleDateString(
                "en-GB",
                {
                  day: "2-digit",
                  month: "short",
                }
              ),
              weekday: date.toLocaleDateString(
                "en-GB",
                {
                  weekday: "short",
                }
              ),
              slots: result.slots,
            };
          });

      setAvailableDates(available);
    } catch (error) {
      console.error(
        "Error loading availability:",
        error
      );

      setAvailabilityError(
        "Unable to load available appointment dates."
      );

      setAvailableDates([]);
      setAvailableSlots([]);
    } finally {
      setIsLoadingDates(false);
    }
  }

  loadAvailableDates();
}, [selectedService]);

  /*
   * ---------------------------------------------------------
   * Load slots when date changes
   * ---------------------------------------------------------
   */

useEffect(() => {
  if (!selectedService || !selectedDate) {
    setAvailableSlots([]);
    return;
  }

  const serviceId = selectedService.id;
  const date = selectedDate.date;

  async function loadAvailableSlots() {
    try {
      setIsLoadingSlots(true);
      setAvailabilityError(null);

      const response = await fetch(
        `/api/availability?serviceId=${encodeURIComponent(
          serviceId
        )}&date=${encodeURIComponent(date)}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to load available times."
        );
      }

      const data = await response.json();

      setAvailableSlots(data.slots ?? []);
    } catch (error) {
      console.error(
        "Error loading slots:",
        error
      );

      setAvailabilityError(
        "Unable to load available appointment times."
      );

      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }

  loadAvailableSlots();
}, [selectedService, selectedDate]);

  /*
   * ---------------------------------------------------------
   * Convert selected Hamburg time to UTC
   * ---------------------------------------------------------
   *
   * Current implementation is suitable for the
   * September 2026 test dates.
   *
   * Hamburg is UTC+2 during CEST.
   */

  function getUtcDateTime(): string {
    if (
      !selectedDate ||
      !selectedTime
    ) {
      throw new Error(
        "Date and time are required."
      );
    }

    return selectedTime;
  }

  function formatBookingDateTime(utcDateTime: string): string {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "full",
      timeStyle: "short",
      hour12: false,
    }).format(new Date(utcDateTime));
}

  /*
   * ---------------------------------------------------------
   * Format price
   * ---------------------------------------------------------
   */

  function formatPrice(
    price: number
  ): string {
    return new Intl.NumberFormat(
      "de-DE",
      {
        style: "currency",
        currency: "EUR",
      }
    ).format(price);
  }

  /*
   * ---------------------------------------------------------
   * Format Time
   * ---------------------------------------------------------
   */

  function formatSlotTime(utcDateTime: string): string {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(utcDateTime));
  }

  /*
   * ---------------------------------------------------------
   * Select service
   * ---------------------------------------------------------
   */

  function handleServiceSelect(
    service: Service
  ) {
    setSelectedService(service);
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableDates([]);
    setAvailableSlots([]);
    setAvailabilityError(null);
  }

  /*
   * ---------------------------------------------------------
   * Select date
   * ---------------------------------------------------------
   */

  function handleDateSelect(
    date: AvailableDate
  ) {
    setSelectedDate(date);
    setSelectedTime(null);
    setAvailableSlots([]);
  }

  /*
   * ---------------------------------------------------------
   * Continue from service
   * ---------------------------------------------------------
   */

  function handleServiceContinue() {
    if (!selectedService) {
      return;
    }

    setStep(2);
  }

  /*
   * ---------------------------------------------------------
   * Continue from date/time
   * ---------------------------------------------------------
   */

  function handleDateContinue() {
    if (
      !selectedDate ||
      !selectedTime
    ) {
      return;
    }

    setStep(3);
  }

  /*
   * ---------------------------------------------------------
   * Submit booking
   * ---------------------------------------------------------
   */

  async function handleBookingSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !selectedService ||
      !selectedDate ||
      !selectedTime
    ) {
      return;
    }

    try {
      setIsBooking(true);
      setBookingError(null);

      const startDateTime =
        getUtcDateTime();

      const response = await fetch(
        "/api/book-appointment",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            serviceId:
              selectedService.dataverseId,
            startDateTime,
            firstName:
              firstName.trim(),
            lastName:
              lastName.trim(),
            email:
              email.trim(),
            phone:
              phone.trim(),
          }),
        }
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to book the appointment."
        );
      }

      setBookingResult({
        bookingReference:
          result.bookingReference,
        appointmentId:
          result.appointmentId,
        message:
          result.message ??
          "Your appointment has been confirmed.",
      });

      setStep(4);
    } catch (error) {
      console.error(
        "Booking error:",
        error
      );

      setBookingError(
        error instanceof Error
          ? error.message
          : "Unable to book the appointment."
      );
    } finally {
      setIsBooking(false);
    }
  }

  /*
   * ---------------------------------------------------------
   * Step indicator
   * ---------------------------------------------------------
   */

  function renderStepIndicator() {
    return (
      <div className="booking-steps">
        <div
          className={`booking-step ${
            step >= 1
              ? "active"
              : ""
          }`}
        >
          <span>1</span>
          <label>Service</label>
        </div>

        <div className="booking-step-line" />

        <div
          className={`booking-step ${
            step >= 2
              ? "active"
              : ""
          }`}
        >
          <span>2</span>
          <label>Date & Time</label>
        </div>

        <div className="booking-step-line" />

        <div
          className={`booking-step ${
            step >= 3
              ? "active"
              : ""
          }`}
        >
          <span>3</span>
          <label>Your Details</label>
        </div>

        <div className="booking-step-line" />

        <div
          className={`booking-step ${
            step >= 4
              ? "active"
              : ""
          }`}
        >
          <span>4</span>
          <label>Confirmation</label>
        </div>
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * Main render
   * ---------------------------------------------------------
   */

  return (
    <main className="booking-page">
      <section className="booking-hero">
        <div className="container">
          <a
            href="/"
            className="booking-back-link"
          >
            <ArrowLeft size={16} />
            Back to home
          </a>

          <div className="booking-hero-content">
            <span className="eyebrow">
              ONLINE APPOINTMENT
            </span>

            <h1>
              Book your dental
              appointment
            </h1>

            <p>
              Choose a service, select
              an available time, and
              provide your details.
            </p>
          </div>
        </div>
      </section>

      <section className="booking-section">
        <div className="container">
          {renderStepIndicator()}

          <div className="booking-layout">
            <div className="booking-main">

              {/* -------------------------------------------------
                  STEP 1 — SERVICE
              -------------------------------------------------- */}

              {step === 1 && (
                <div className="booking-card">
                  <div className="booking-card-header">
                    <div>
                      <span className="eyebrow">
                        STEP 1
                      </span>

                      <h2>
                        Choose a service
                      </h2>

                      <p>
                        Select the dental
                        service you would
                        like to book.
                      </p>
                    </div>
                  </div>

                  {isLoadingServices && (
                    <div className="loading-message">
                      Loading available
                      services...
                    </div>
                  )}

                  {!isLoadingServices &&
                    servicesError && (
                      <div
                        className="error-message"
                        role="alert"
                      >
                        {servicesError}
                      </div>
                    )}

                  {!isLoadingServices &&
                    !servicesError &&
                    services.length ===
                      0 && (
                      <div className="loading-message">
                        No dental services
                        are currently
                        available.
                      </div>
                    )}

                  {!isLoadingServices &&
                    !servicesError &&
                    services.length >
                      0 && (
                      <div className="service-options">
                        {services.map(
                          (service) => (
                            <button
                              type="button"
                              key={
                                service.id
                              }
                              className={`service-option ${
                                selectedService?.id ===
                                service.id
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={() =>
                                handleServiceSelect(
                                  service
                                )
                              }
                            >
                              <div className="service-option-content">
                                <strong>
                                  {
                                    service.name
                                  }
                                </strong>

                                <span>
                                  {
                                    service.description
                                  }
                                </span>

                                <small>
                                  <Clock3
                                    size={
                                      13
                                    }
                                  />

                                  {
                                    service.duration
                                  }
                                </small>
                              </div>

                              <div className="service-price">
                                {formatPrice(
                                  service.price
                                )}
                              </div>
                            </button>
                          )
                        )}
                      </div>
                    )}

                  <div className="booking-actions">
                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        !selectedService
                      }
                      onClick={
                        handleServiceContinue
                      }
                    >
                      Continue
                      <ArrowRight
                        size={17}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------
                  STEP 2 — DATE & TIME
              -------------------------------------------------- */}

              {step === 2 && (
                <div className="booking-card">
                  <div className="booking-card-header">
                    <div>
                      <span className="eyebrow">
                        STEP 2
                      </span>

                      <h2>
                        Select date & time
                      </h2>

                      <p>
                        Choose from the
                        currently available
                        appointment slots.
                      </p>
                    </div>
                  </div>

                  {availabilityError && (
                    <div
                      className="error-message"
                      role="alert"
                    >
                      {availabilityError}
                    </div>
                  )}

                  <div className="booking-field-section">
                    <div className="booking-field-title">
                      <CalendarDays
                        size={18}
                      />

                      <h3>
                        Available dates
                      </h3>
                    </div>

                    {isLoadingDates && (
                      <div className="loading-message">
                        Checking available
                        dates...
                      </div>
                    )}

                    {!isLoadingDates &&
                      availableDates.length >
                        0 && (
                        <div className="date-options">
                          {availableDates.map(
                            (date) => (
                              <button
                                type="button"
                                key={
                                  date.date
                                }
                                className={`date-option ${
                                  selectedDate?.date ===
                                  date.date
                                    ? "selected"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleDateSelect(
                                    date
                                  )
                                }
                              >
                                <span>
                                  {
                                    date.weekday
                                  }
                                </span>

                                <strong>
                                  {
                                    date.label
                                  }
                                </strong>
                              </button>
                            )
                          )}
                        </div>
                      )}

                    {!isLoadingDates &&
                      availableDates.length ===
                        0 &&
                      !availabilityError && (
                        <div className="loading-message">
                          No appointments
                          are available
                          for this service
                          in the next
                          14 days.
                        </div>
                      )}
                  </div>

                  {selectedDate && (
                    <div className="booking-field-section">
                      <div className="booking-field-title">
                        <Clock3
                          size={18}
                        />

                        <h3>
                          Available times
                        </h3>
                      </div>

                      {isLoadingSlots && (
                        <div className="loading-message">
                          Checking available
                          times...
                        </div>
                      )}

                      {!isLoadingSlots &&
                        availableSlots.length >
                          0 && (
                          <div className="time-options">
                            {availableSlots.map(
                              (slot) => (
                                <button
                                  type="button"
                                  key={`${slot.start}-${slot.end}`}
                                  className={`time-option ${
                                    selectedTime === slot.start
                                      ? "selected"
                                      : ""
                                  }`}
                                  onClick={() =>
                                    setSelectedTime(slot.start)
                                  }
                                >
                                  {formatSlotTime(slot.start)}
                                </button>
                              )
                            )}
                          </div>
                        )}

                      {!isLoadingSlots &&
                        availableSlots.length ===
                          0 && (
                          <div className="loading-message">
                            No available
                            times for
                            this date.
                          </div>
                        )}
                    </div>
                  )}

                  <div className="booking-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        setStep(1)
                      }
                    >
                      <ArrowLeft
                        size={17}
                      />
                      Back
                    </button>

                    <button
                      type="button"
                      className="primary-button"
                      disabled={
                        !selectedDate ||
                        !selectedTime
                      }
                      onClick={
                        handleDateContinue
                      }
                    >
                      Continue
                      <ArrowRight
                        size={17}
                      />
                    </button>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------
                  STEP 3 — PATIENT DETAILS
              -------------------------------------------------- */}

              {step === 3 && (
                <div className="booking-card">
                  <div className="booking-card-header">
                    <div>
                      <span className="eyebrow">
                        STEP 3
                      </span>

                      <h2>
                        Your details
                      </h2>

                      <p>
                        Please provide your
                        contact information
                        to complete the
                        booking.
                      </p>
                    </div>
                  </div>

                  <form
                    onSubmit={
                      handleBookingSubmit
                    }
                  >
                    <div className="form-grid">
                      <div className="form-group">
                        <label htmlFor="firstName">
                          First name
                        </label>

                        <div className="input-with-icon">
                          <User
                            size={17}
                          />

                          <input
                            id="firstName"
                            type="text"
                            value={
                              firstName
                            }
                            onChange={(e) =>
                              setFirstName(
                                e.target.value
                              )
                            }
                            placeholder="First name"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label htmlFor="lastName">
                          Last name
                        </label>

                        <div className="input-with-icon">
                          <User
                            size={17}
                          />

                          <input
                            id="lastName"
                            type="text"
                            value={
                              lastName
                            }
                            onChange={(e) =>
                              setLastName(
                                e.target.value
                              )
                            }
                            placeholder="Last name"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">
                        Email address
                      </label>

                      <div className="input-with-icon">
                        <Mail
                          size={17}
                        />

                        <input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) =>
                            setEmail(
                              e.target.value
                            )
                          }
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone">
                        Phone number
                      </label>

                      <div className="input-with-icon">
                        <Phone
                          size={17}
                        />

                        <input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) =>
                            setPhone(
                              e.target.value
                            )
                          }
                          placeholder="+49 ..."
                          required
                        />
                      </div>
                    </div>

                    {bookingError && (
                      <div
                        className="error-message"
                        role="alert"
                      >
                        {bookingError}
                      </div>
                    )}

                    <div className="booking-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={
                          isBooking
                        }
                        onClick={() =>
                          setStep(2)
                        }
                      >
                        <ArrowLeft
                          size={17}
                        />
                        Back
                      </button>

                      <button
                        type="submit"
                        className="primary-button"
                        disabled={
                          isBooking
                        }
                      >
                        {isBooking
                          ? "Booking..."
                          : "Confirm appointment"}

                        {!isBooking && (
                          <CheckCircle2
                            size={17}
                          />
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* -------------------------------------------------
                  STEP 4 — CONFIRMATION
              -------------------------------------------------- */}

              {step === 4 &&
                bookingResult && (
                  <div className="booking-card confirmation-card">
                    <div className="confirmation-icon">
                      <CheckCircle2
                        size={42}
                      />
                    </div>

                    <span className="eyebrow">
                      APPOINTMENT CONFIRMED
                    </span>

                    <h2>
                      Your appointment is
                      confirmed
                    </h2>

                    <p>
                      {bookingResult.message}
                    </p>

                    <div className="booking-reference">
                      <span>
                        Booking reference
                      </span>

                      <strong>
                        {
                          bookingResult.bookingReference
                        }
                      </strong>
                    </div>

                    <div className="confirmation-details">
                      <div>
                        <span>
                          Service
                        </span>

                        <strong>
                          {
                            selectedService?.name
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Date
                        </span>

                        <strong>
                          {
                            selectedDate?.weekday
                          }
                          ,{" "}
                          {
                            selectedDate?.label
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Time
                        </span>

                        <strong>
                          {
                            selectedTime ? formatBookingDateTime(selectedTime) : ""
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Duration
                        </span>

                        <strong>
                          {
                            selectedService?.duration
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="confirmation-note">
                      <strong>
                        Please save your
                        booking reference.
                      </strong>

                      <p>
                        If you need to contact
                        the clinic about your
                        appointment, please
                        provide this reference.
                      </p>
                    </div>

                    <div className="booking-actions">
                      <a
                        href="/"
                        className="primary-button"
                      >
                        Back to home
                        <ArrowRight
                          size={17}
                        />
                      </a>
                    </div>
                  </div>
                )}
            </div>

            {/* -------------------------------------------------
                BOOKING SUMMARY
            -------------------------------------------------- */}

            <aside className="booking-summary">
              <div className="summary-card">
                <span className="eyebrow">
                  YOUR APPOINTMENT
                </span>

                <h3>
                  Booking summary
                </h3>

                <div className="summary-divider" />

                <div className="summary-item">
                  <span>
                    Service
                  </span>

                  <strong>
                    {selectedService
                      ? selectedService.name
                      : "Not selected"}
                  </strong>
                </div>

                {selectedService && (
                  <div className="summary-item">
                    <span>
                      Duration
                    </span>

                    <strong>
                      {
                        selectedService.duration
                      }
                    </strong>
                  </div>
                )}

                <div className="summary-item">
                  <span>
                    Date
                  </span>

                  <strong>
                    {selectedDate
                      ? `${selectedDate.weekday}, ${selectedDate.label}`
                      : "Not selected"}
                  </strong>
                </div>

                <div className="summary-item">
                  <span>
                    Time
                  </span>

                  <strong>
                    {selectedTime ? formatBookingDateTime(selectedTime) :
                      "Not selected"}
                  </strong>
                </div>

                {selectedService && (
                  <>
                    <div className="summary-divider" />

                    <div className="summary-total">
                      <span>
                        Estimated price
                      </span>

                      <strong>
                        {formatPrice(
                          selectedService.price
                        )}
                      </strong>
                    </div>
                  </>
                )}

                <div className="clinic-summary">
                  <strong>
                    Oral-H Dental
                    Care
                  </strong>

                  <span>
                    Modern dental care
                    with a personal
                    touch.
                  </span>

                  <span>
                    Biratnagar 7, 56613 Dharan Road, Nepal
                  </span>

                  <span>
                    Mon–Fri · 08:00–18:00
                  </span>

                  <span>
                    +977 9807302924
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}