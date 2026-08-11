# [Project Name] Service Plan (PRD_lite)

- Author: [name]
- Date: (today's date)

---

## 1. In one line, what is this app?
- Answer: A web service that lets customers request computer hardware repairs and track their repair status online.

---

## 2. Who uses it, and why? (just one line each!)
- Who uses it?
  - Answer: Customers who own computers/hardware in need of repair.
- What inconvenience does it solve?
  - Answer: They no longer need to visit or call the service center in person just to check repair status.

---

## 3. Core features to build (exactly 2!)
> 💡 If you try to build too many features, the AI tangles up the code.
> Pick just the 2 most important features and give the AI their "rules."

### 1) Repair Request Submission
- Description: Customers submit a new repair request with their device and issue details.
- Rules the AI must follow:
  - Required fields: device type, issue description (minimum 10 characters), contact phone number.
  - Up to 3 photo attachments allowed, each file must be 5MB or smaller.
  - On submission, status is automatically set to "Received."

### 2) Repair Status Tracking
- Description: Customers check the progress of their repair request.
- Rules the AI must follow:
  - Status must be exactly one of these 4 stages: Received → In Repair → Ready for Pickup → Completed.
  - Lookup requires both the request ID and the phone number to match (2-factor lookup, no name-only search).

---

## 4. Features you will definitely NOT build this time (let go of extras)
> 💡 Declaring "I won't build this" to the AI up front keeps it from coding the wrong things.
- No online payment/invoicing (payment handled in person for now)
- No admin dashboard for staff to manage repairs (staff will update status manually via database/backend for now)
- No customer accounts/login — lookup is by request ID + phone number only, no registration or password system

---

## 5. Design feel and colors
- Overall mood: Clean, trustworthy, and simple — like a professional repair shop, not flashy.
- Main color: Blue (conveys reliability/tech) with white/gray neutrals.
- Screen-size constraints: Must work well on mobile (customers likely check status from their phone).
