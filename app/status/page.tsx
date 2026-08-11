"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { PHONE_DIGITS, PHONE_RAW_PATTERN } from "@/lib/validation/repairRequest";
import { STATUS_STAGES } from "@/lib/status";

type LookupFormValues = {
  requestId: string;
  phoneNumber: string;
};

type StatusHistoryEntry = { status: string; changed_at: string };

type RequestDetail = {
  id: string;
  deviceType: string;
  deviceTypeOther: string | null;
  issueDescription: string;
  status: string;
  createdAt: string;
};

type Match = { id: string; deviceType: string; status: string };

type LookupResult =
  | { kind: "detail"; request: RequestDetail; statusHistory: StatusHistoryEntry[]; photoUrls: string[] }
  | { kind: "matches"; matches: Match[] }
  | { kind: "not_found" };

export default function StatusPage() {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LookupFormValues>({
    defaultValues: { requestId: "", phoneNumber: "" },
  });

  const [result, setResult] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  // Single source of truth for "a lookup is in flight" — covers both the form
  // submit AND clicking a row in the matches table, since both call
  // runLookup(). A row click bypasses react-hook-form entirely, so its own
  // isSubmitting wouldn't reflect that request.
  const [isLookingUp, setIsLookingUp] = useState(false);

  async function runLookup(requestId: string | undefined, phone: string) {
    setLookupError(null);
    setIsLookingUp(true);

    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestId ? { requestId, phone } : { phone }),
      });
      const body = await res.json();

      if (!res.ok) {
        if (body.error?.code === "NOT_FOUND") {
          setResult({ kind: "not_found" });
        } else {
          setResult(null);
          setLookupError(body.error?.message ?? "Something went wrong. Please try again.");
        }
        return;
      }

      setResult(
        body.data.matches
          ? { kind: "matches", matches: body.data.matches }
          : {
              kind: "detail",
              request: body.data.request,
              statusHistory: body.data.statusHistory,
              photoUrls: body.data.photoUrls,
            }
      );
    } finally {
      setIsLookingUp(false);
    }
  }

  async function onSubmit(values: LookupFormValues) {
    await runLookup(values.requestId.trim() || undefined, values.phoneNumber);
  }

  function handleMatchClick(matchId: string) {
    if (isLookingUp) return;
    runLookup(matchId, getValues("phoneNumber"));
  }

  return (
    <main className="mx-auto min-h-svh max-w-md px-4 py-8">
      <h1 className="mb-6 text-center text-xl font-semibold text-gray-900">Repair Center</h1>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="requestId" className="text-sm font-medium text-gray-700">
              Request ID{" "}
              <span className="font-normal text-gray-500">
                (optional. Leave blank to list all requests for this phone number)
              </span>
            </label>
            <input
              id="requestId"
              type="text"
              placeholder="RPR-000000"
              className="form-input"
              {...register("requestId")}
            />
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

          {lookupError && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{lookupError}</p>
          )}

          <button type="submit" disabled={isLookingUp} className="btn-primary">
            {isLookingUp ? "Checking…" : "Check Status"}
          </button>
        </form>
      </div>

      {isLookingUp && (
        <p className="mt-6 text-center text-sm text-gray-500" role="status">
          Loading…
        </p>
      )}

      {result && (
        <div className={`card mt-6 ${isLookingUp ? "pointer-events-none opacity-50" : ""}`}>
          {result.kind === "not_found" && (
            <div className="rounded-md bg-gray-100 px-4 py-3 text-sm text-gray-700">
              <p className="font-medium">No matching request found.</p>
              <p className="mt-1">
                Please contact the service center directly so staff can look it up manually.
              </p>
            </div>
          )}

          {result.kind === "matches" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-gray-700">Requests for this phone number:</p>
              <table className="w-full overflow-hidden rounded-md border border-gray-200 text-sm">
                <thead className="bg-gray-100 text-left text-gray-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Request ID</th>
                    <th className="px-3 py-2 font-medium">Device</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.matches.map((match) => (
                    <tr
                      key={match.id}
                      onClick={() => handleMatchClick(match.id)}
                      className="cursor-pointer border-t border-gray-200 transition-colors hover:bg-blue-50"
                    >
                      <td className="px-3 py-2 font-medium text-blue-600">{match.id}</td>
                      <td className="px-3 py-2 text-gray-700">{match.deviceType}</td>
                      <td className="px-3 py-2 text-gray-700">{match.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.kind === "detail" && (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-sm text-gray-500">{result.request.id}</p>
                <p className="text-sm text-gray-700">
                  {result.request.deviceType === "Other"
                    ? result.request.deviceTypeOther
                    : result.request.deviceType}
                </p>
              </div>

              <ol className="flex flex-wrap gap-2 text-xs">
                {STATUS_STAGES.map((stage, index) => {
                  const currentIndex = STATUS_STAGES.indexOf(
                    result.request.status as (typeof STATUS_STAGES)[number]
                  );
                  const isDone = index <= currentIndex;
                  return (
                    <li
                      key={stage}
                      className={`rounded-full px-3 py-1 transition-colors ${
                        isDone ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {stage}
                    </li>
                  );
                })}
              </ol>

              <div>
                <p className="mb-1 text-sm font-medium text-gray-700">History</p>
                <ul className="flex flex-col gap-1 text-sm text-gray-600">
                  {result.statusHistory.map((entry, index) => (
                    <li key={index}>
                      {entry.status} · {new Date(entry.changed_at).toLocaleString()}
                    </li>
                  ))}
                </ul>
              </div>

              {result.photoUrls.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700">Photos</p>
                  <div className="flex flex-wrap gap-2">
                    {result.photoUrls.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element -- signed, expiring URLs from Supabase Storage; next/image would require allowlisting the storage domain for URLs that are already short-lived
                      <img
                        key={url}
                        src={url}
                        alt="Repair photo"
                        className="h-20 w-20 rounded-md border border-gray-100 object-cover"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <p className="mt-6 text-center text-sm">
        <Link
          href="/"
          className="text-blue-600 underline underline-offset-2 transition-colors hover:text-blue-700"
        >
          ← Submit a new request
        </Link>
      </p>
    </main>
  );
}
