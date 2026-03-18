"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/contexts/WalletContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  hashInviteCode,
  minutesToAbsoluteBlock,
  stxToMicroStx,
} from "@/lib/private-event-utils";
import { createPrivateEventTxOptions } from "@/lib/private-stacks";
import { HIRO_API } from "@/lib/contracts";

interface FormState {
  title: string;
  entryFee: string;
  joinDeadlineMinutes: string;
  maxRounds: string;
  intervalBlocks: string;
  submissionWindow: string;
  answerWindow: string;
  inviteCode: string;
}

interface FormErrors {
  title?: string;
  entryFee?: string;
  joinDeadlineMinutes?: string;
  maxRounds?: string;
  intervalBlocks?: string;
  submissionWindow?: string;
  answerWindow?: string;
  inviteCode?: string;
  general?: string;
}

const INITIAL: FormState = {
  title: "",
  entryFee: "",
  joinDeadlineMinutes: "",
  maxRounds: "",
  intervalBlocks: "",
  submissionWindow: "",
  answerWindow: "",
  inviteCode: "",
};

export default function CreatePrivateEventPage() {
  const router = useRouter();
  const { isConnected, connectWallet } = useWallet();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
    setCancelled(false);
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!form.title.trim()) e.title = "Title is required";
    else if (form.title.length > 64) e.title = "Max 64 characters";

    const fee = parseFloat(form.entryFee);
    if (!form.entryFee) e.entryFee = "Entry fee is required";
    else if (isNaN(fee) || fee < 0)
      e.entryFee = "Must be a non-negative number";

    const mins = parseInt(form.joinDeadlineMinutes, 10);
    if (!form.joinDeadlineMinutes)
      e.joinDeadlineMinutes = "Join deadline is required";
    else if (isNaN(mins) || mins < 1)
      e.joinDeadlineMinutes = "Must be at least 1 minute";

    const rounds = parseInt(form.maxRounds, 10);
    if (!form.maxRounds) e.maxRounds = "Max rounds is required";
    else if (isNaN(rounds) || rounds < 1) e.maxRounds = "Must be at least 1";

    const interval = parseInt(form.intervalBlocks, 10);
    if (!form.intervalBlocks) e.intervalBlocks = "Interval blocks is required";
    else if (isNaN(interval) || interval < 1)
      e.intervalBlocks = "Must be at least 1";

    const subWindow = parseInt(form.submissionWindow, 10);
    if (!form.submissionWindow)
      e.submissionWindow = "Submission window is required";
    else if (isNaN(subWindow) || subWindow < 1)
      e.submissionWindow = "Must be at least 1";

    const ansWindow = parseInt(form.answerWindow, 10);
    if (!form.answerWindow) e.answerWindow = "Answer window is required";
    else if (isNaN(ansWindow) || ansWindow < 1)
      e.answerWindow = "Must be at least 1";

    if (!form.inviteCode.trim()) e.inviteCode = "Invite code is required";

    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setPending(true);
    setCancelled(false);

    try {
      // Fetch current block height
      const info = await fetch(`${HIRO_API}/v2/info`)
        .then((r) => r.json())
        .catch(() => null);
      if (!info?.burn_block_height) {
        setErrors({
          general: "Could not fetch current block height. Please try again.",
        });
        setPending(false);
        return;
      }

      const currentBlock: number = info.burn_block_height;
      const joinDeadline = minutesToAbsoluteBlock(
        parseInt(form.joinDeadlineMinutes, 10),
        currentBlock,
      );
      const inviteHash = await hashInviteCode(form.inviteCode);
      const entryFee = stxToMicroStx(parseFloat(form.entryFee));

      const txOptions = createPrivateEventTxOptions(
        form.title.trim(),
        inviteHash,
        entryFee,
        joinDeadline,
        parseInt(form.maxRounds, 10),
        parseInt(form.intervalBlocks, 10),
        parseInt(form.submissionWindow, 10),
        parseInt(form.answerWindow, 10),
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { openContractCall } = (await import("@stacks/connect")) as any;
      await openContractCall({
        ...txOptions,
        onFinish: () => {
          setPending(false);
          router.push("/private-events");
        },
        onCancel: () => {
          setPending(false);
          setCancelled(true);
        },
      });
    } catch {
      setErrors({ general: "Crypto API unavailable — use a modern browser." });
      setPending(false);
    }
  }

  if (!isConnected) {
    return (
      <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-20 flex flex-col items-center justify-center">
          <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl p-10 text-center max-w-md w-full">
            <div className="text-5xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Connect Wallet
            </h2>
            <p className="text-gray-400 mb-6">
              You need a connected wallet to create a private event.
            </p>
            <button
              onClick={connectWallet}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-8 rounded-lg transition"
            >
              Connect Wallet
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="relative pt-20 min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-20">
      <Header />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <button
          onClick={() => router.push("/private-events")}
          className="text-gray-400 hover:text-white mb-6 flex items-center gap-2 transition"
        >
          ← Back to Private Events
        </button>

        <h1 className="text-4xl font-bold text-white mb-2">
          Create Private Event
        </h1>
        <p className="text-gray-400 mb-8">
          Set up an invite-only prediction game for you and your friends.
        </p>

        {cancelled && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-yellow-400 text-sm">
            Transaction cancelled. Your form is still filled in.
          </div>
        )}

        {errors.general && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
            {errors.general}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-gray-800/40 border border-gray-700/50 rounded-2xl p-8"
        >
          <Field
            label="Event Title"
            error={errors.title}
            hint="Max 64 ASCII characters"
          >
            <input
              type="text"
              maxLength={64}
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="My BTC Prediction Game"
              className={inputCls(!!errors.title)}
            />
          </Field>

          <Field
            label="Entry Fee (STX)"
            error={errors.entryFee}
            hint="Amount each participant pays to join"
          >
            <input
              type="number"
              min={0}
              step="0.000001"
              value={form.entryFee}
              onChange={(e) => set("entryFee", e.target.value)}
              placeholder="e.g. 1"
              className={inputCls(!!errors.entryFee)}
            />
          </Field>

          <Field
            label="Join Deadline (minutes from now)"
            error={errors.joinDeadlineMinutes}
            hint="How long others have to join before the event starts"
          >
            <input
              type="number"
              min={1}
              value={form.joinDeadlineMinutes}
              onChange={(e) => set("joinDeadlineMinutes", e.target.value)}
              placeholder="e.g. 60"
              className={inputCls(!!errors.joinDeadlineMinutes)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Max Rounds" error={errors.maxRounds}>
              <input
                type="number"
                min={1}
                value={form.maxRounds}
                onChange={(e) => set("maxRounds", e.target.value)}
                placeholder="e.g. 5"
                className={inputCls(!!errors.maxRounds)}
              />
            </Field>
            <Field
              label="Interval Blocks"
              error={errors.intervalBlocks}
              hint="Blocks between rounds"
            >
              <input
                type="number"
                min={1}
                value={form.intervalBlocks}
                onChange={(e) => set("intervalBlocks", e.target.value)}
                placeholder="e.g. 144"
                className={inputCls(!!errors.intervalBlocks)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Submission Window (blocks)"
              error={errors.submissionWindow}
            >
              <input
                type="number"
                min={1}
                value={form.submissionWindow}
                onChange={(e) => set("submissionWindow", e.target.value)}
                placeholder="e.g. 10"
                className={inputCls(!!errors.submissionWindow)}
              />
            </Field>
            <Field label="Answer Window (blocks)" error={errors.answerWindow}>
              <input
                type="number"
                min={1}
                value={form.answerWindow}
                onChange={(e) => set("answerWindow", e.target.value)}
                placeholder="e.g. 20"
                className={inputCls(!!errors.answerWindow)}
              />
            </Field>
          </div>

          <Field
            label="Invite Code"
            error={errors.inviteCode}
            hint="Share this secret with friends — it will be hashed before going on-chain"
          >
            <input
              type="text"
              value={form.inviteCode}
              onChange={(e) => set("inviteCode", e.target.value)}
              placeholder="e.g. my-secret-code-123"
              className={inputCls(!!errors.inviteCode)}
            />
          </Field>

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-lg transition disabled:opacity-50"
          >
            {pending ? "Waiting for wallet…" : "Create Private Event"}
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full bg-gray-900/60 border ${hasError ? "border-red-500" : "border-gray-600"} rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition`;
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-gray-300 text-sm font-medium mb-1">
        {label}
      </label>
      {hint && <p className="text-gray-500 text-xs mb-1.5">{hint}</p>}
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
