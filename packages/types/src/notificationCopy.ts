interface NotificationCopy {
  title: string;
  withSuburb: string;
  withoutSuburb: string;
}

const COPY_BY_STATUS: Record<string, NotificationCopy> = {
  booked: {
    title: "Job booked",
    withSuburb: "Your job in {suburb} is booked.",
    withoutSuburb: "Your job is booked.",
  },
  dispatched: {
    title: "Finding an operator",
    withSuburb: "We're matching an operator for your job in {suburb}.",
    withoutSuburb: "We're matching an operator for your job.",
  },
  accepted: {
    title: "Operator assigned",
    withSuburb: "An operator has accepted your job in {suburb}.",
    withoutSuburb: "An operator has accepted your job.",
  },
  allocated: {
    title: "Operator on the way",
    withSuburb: "Your operator is heading to {suburb}.",
    withoutSuburb: "Your operator is on the way.",
  },
  assessed: {
    title: "Site assessed",
    withSuburb: "Your job in {suburb} has been assessed.",
    withoutSuburb: "Your job has been assessed.",
  },
  flown: {
    title: "Flight complete",
    withSuburb: "The flight for your job in {suburb} is complete.",
    withoutSuburb: "The flight for your job is complete.",
  },
  delivered: {
    title: "Your data is ready",
    withSuburb: "Deliverables for your job in {suburb} are ready to view.",
    withoutSuburb: "Deliverables for your job are ready to view.",
  },
  disputed: {
    title: "Job under review",
    withSuburb: "Your job in {suburb} is under review.",
    withoutSuburb: "Your job is under review.",
  },
  cancelled: {
    title: "Job cancelled",
    withSuburb: "Your job in {suburb} was cancelled.",
    withoutSuburb: "Your job was cancelled.",
  },
};

const DEFAULT_COPY: NotificationCopy = {
  title: "Job update",
  withSuburb: "There's an update on your job in {suburb}.",
  withoutSuburb: "There's an update on your job.",
};

export function notificationCopyForStatus(
  toStatus: string,
  suburb: string | null,
): { title: string; body: string } {
  const copy = COPY_BY_STATUS[toStatus] ?? DEFAULT_COPY;
  const trimmedSuburb = typeof suburb === "string" ? suburb.trim() : "";
  if (!trimmedSuburb) {
    return {
      title: copy.title,
      body: copy.withoutSuburb,
    };
  }

  return {
    title: copy.title,
    body: copy.withSuburb.replace("{suburb}", trimmedSuburb),
  };
}
