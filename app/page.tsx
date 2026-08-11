"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  DEVICE_TYPES,
  ISSUE_DESCRIPTION_MAX,
  ISSUE_DESCRIPTION_MIN,
  MAX_PHOTOS,
  PHONE_DIGITS,
  PHONE_RAW_PATTERN,
  validatePhotos,
} from "@/lib/validation/repairRequest";

type FormValues = {
  deviceType: (typeof DEVICE_TYPES)[number] | "";
  deviceTypeOther: string;
  issueDescription: string;
  phoneNumber: string;
};

export default function Home() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      deviceType: "",
      deviceTypeOther: "",
      issueDescription: "",
      phoneNumber: "",
    },
  });

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const deviceType = watch("deviceType");

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const error = validatePhotos(files);
    setPhotoError(error);
    setPhotos(error ? [] : files);
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((current) => current.filter((_, i) => i !== index));
    setPhotoError(null);
  }

  async function onSubmit(values: FormValues) {
    setSubmitError(null);

    const currentPhotoError = validatePhotos(photos);
    if (currentPhotoError) {
      setPhotoError(currentPhotoError);
      return;
    }

    const formData = new FormData();
    formData.set("deviceType", values.deviceType);
    if (values.deviceType === "Other") {
      formData.set("deviceTypeOther", values.deviceTypeOther);
    }
    formData.set("issueDescription", values.issueDescription);
    formData.set("phoneNumber", values.phoneNumber);
    for (const photo of photos) {
      formData.append("photos", photo);
    }

    const res = await fetch("/api/requests", { method: "POST", body: formData });
    const body = await res.json();

    if (!res.ok) {
      setSubmitError(body.error?.message ?? "Something went wrong. Please try again.");
      return;
    }

    setRequestId(body.data.requestId);
  }

  if (requestId) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-8">
        <div className="card flex flex-col items-center gap-4 text-center">
          <h1 className="text-lg font-semibold text-gray-900">Request submitted</h1>
          <p className="text-sm text-gray-600">Your repair request ID is:</p>
          <p className="text-3xl font-bold tracking-wide text-blue-600">{requestId}</p>
          <p className="text-sm text-gray-600">
            Save this ID. You&apos;ll need it, along with your phone number, to check your
            repair status.
          </p>
          <Link
            href="/status"
            className="mt-2 text-sm font-medium text-blue-600 underline underline-offset-2 transition-colors hover:text-blue-700"
          >
            Check status →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-svh max-w-md px-4 py-8">
      <h1 className="mb-6 text-center text-xl font-semibold text-gray-900">Repair Center</h1>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="deviceType" className="text-sm font-medium text-gray-700">
              Device type
            </label>
            <select
              id="deviceType"
              className="form-input"
              {...register("deviceType", { required: "Please select a device type" })}
            >
              <option value="" disabled>
                Select a device type
              </option>
              {DEVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            {errors.deviceType && (
              <p className="text-sm text-red-600">{errors.deviceType.message}</p>
            )}
          </div>

          {deviceType === "Other" && (
            <div className="flex flex-col gap-1">
              <label htmlFor="deviceTypeOther" className="text-sm font-medium text-gray-700">
                Please specify the device
              </label>
              <input
                id="deviceTypeOther"
                type="text"
                className="form-input"
                {...register("deviceTypeOther", {
                  validate: (value) =>
                    deviceType !== "Other" ||
                    (value ?? "").trim().length > 0 ||
                    "Please specify the device type",
                })}
              />
              {errors.deviceTypeOther && (
                <p className="text-sm text-red-600">{errors.deviceTypeOther.message}</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="issueDescription" className="text-sm font-medium text-gray-700">
              Issue description
            </label>
            <textarea
              id="issueDescription"
              rows={4}
              className="form-input"
              {...register("issueDescription", {
                required: "Please describe the issue",
                minLength: {
                  value: ISSUE_DESCRIPTION_MIN,
                  message: `Issue description must be at least ${ISSUE_DESCRIPTION_MIN} characters`,
                },
                maxLength: {
                  value: ISSUE_DESCRIPTION_MAX,
                  message: `Issue description must be at most ${ISSUE_DESCRIPTION_MAX} characters`,
                },
              })}
            />
            {errors.issueDescription && (
              <p className="text-sm text-red-600">{errors.issueDescription.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">
              Phone number
            </label>
            <input
              id="phoneNumber"
              type="tel"
              className="form-input"
              {...register("phoneNumber", {
                required: "Please enter your phone number",
                pattern: {
                  value: PHONE_RAW_PATTERN,
                  message: "Phone number may only contain digits and standard formatting characters",
                },
                validate: (value) =>
                  value.replace(/\D/g, "").length === PHONE_DIGITS ||
                  `Phone number must be exactly ${PHONE_DIGITS} digits`,
              })}
            />
            {errors.phoneNumber && (
              <p className="text-sm text-red-600">{errors.phoneNumber.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="photos" className="text-sm font-medium text-gray-700">
              Photos (optional, up to {MAX_PHOTOS})
            </label>
            <input
              id="photos"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={handlePhotoChange}
              className="text-sm"
            />
            {photoError && <p className="text-sm text-red-600">{photoError}</p>}
            {photos.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1">
                {photos.map((photo, index) => (
                  <li
                    key={`${photo.name}-${index}`}
                    className="flex items-center justify-between rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700"
                  >
                    <span className="truncate">{photo.name}</span>
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="ml-2 shrink-0 text-red-600 transition-colors hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {submitError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{submitError}</p>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm">
        <Link
          href="/status"
          className="text-blue-600 underline underline-offset-2 transition-colors hover:text-blue-700"
        >
          → Check Status
        </Link>
      </p>
    </main>
  );
}
