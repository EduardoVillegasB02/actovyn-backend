-- CreateEnum
CREATE TYPE "IntentionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'RESCHEDULED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CREATED', 'PREDICTED', 'RESCHEDULED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('VERY_LIKELY', 'LIKELY', 'UNCERTAIN', 'HIGH_RISK', 'VERY_HIGH_RISK');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "intention" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "category" TEXT,
    "raw_message" TEXT NOT NULL,
    "local_hour" INTEGER,
    "weekday" INTEGER,
    "scheduled_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "status" "IntentionStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "intention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intention_event" (
    "id" TEXT NOT NULL,
    "intention_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "type" "EventType" NOT NULL,

    CONSTRAINT "intention_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediction" (
    "id" TEXT NOT NULL,
    "intention_id" TEXT NOT NULL,
    "commitment_score" DOUBLE PRECISION NOT NULL,
    "sample_size" INTEGER NOT NULL,
    "historical_adherence" DOUBLE PRECISION NOT NULL,
    "time_compatibility" DOUBLE PRECISION NOT NULL,
    "difficulty_fit" DOUBLE PRECISION NOT NULL,
    "recent_consistency" DOUBLE PRECISION NOT NULL,
    "linguistic_confidence" DOUBLE PRECISION NOT NULL,
    "capped_by" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "model_version" TEXT NOT NULL DEFAULT 'score-v1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weights" JSONB NOT NULL,
    "risk" "RiskLevel" NOT NULL,
    "confidence" "ConfidenceLevel" NOT NULL,

    CONSTRAINT "prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation" (
    "id" TEXT NOT NULL,
    "prediction_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "accepted" BOOLEAN,
    "suggested_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Lima',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "intention_user_id_status_idx" ON "intention"("user_id", "status");

-- CreateIndex
CREATE INDEX "intention_user_id_local_hour_idx" ON "intention"("user_id", "local_hour");

-- CreateIndex
CREATE INDEX "intention_user_id_closed_at_idx" ON "intention"("user_id", "closed_at");

-- CreateIndex
CREATE INDEX "intention_event_intention_id_occurred_at_idx" ON "intention_event"("intention_id", "occurred_at");

-- CreateIndex
CREATE INDEX "prediction_intention_id_created_at_idx" ON "prediction"("intention_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_prediction_id_key" ON "recommendation"("prediction_id");

-- AddForeignKey
ALTER TABLE "intention" ADD CONSTRAINT "intention_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intention_event" ADD CONSTRAINT "intention_event_intention_id_fkey" FOREIGN KEY ("intention_id") REFERENCES "intention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediction" ADD CONSTRAINT "prediction_intention_id_fkey" FOREIGN KEY ("intention_id") REFERENCES "intention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation" ADD CONSTRAINT "recommendation_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
