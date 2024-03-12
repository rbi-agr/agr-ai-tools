-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "speech_to_text" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,
    "audio" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "spell_corrected_text" TEXT NOT NULL,
    "queryId" UUID,
    "timeTaken" TEXT,
    "spellCheckTimeTaken" TEXT,
    "error" TEXT,
    "phoneNumber" TEXT,

    CONSTRAINT "speech_to_text_pkey" PRIMARY KEY ("id")
);
