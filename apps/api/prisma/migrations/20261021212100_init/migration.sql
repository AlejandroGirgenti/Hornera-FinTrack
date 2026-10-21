-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "baseCurrency" "Currency" NOT NULL DEFAULT 'ARS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ARS',
    "exchangeRate" DECIMAL(14,4),
    "amountInBase" DECIMAL(14,2) NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "recurringRuleId" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "limitAmount" DECIMAL(14,2) NOT NULL,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'ARS',
    "note" TEXT,
    "frequency" "Frequency" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "nextRunAt" DATE NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_userId_name_type_key" ON "Category"("userId", "name", "type");

-- CreateIndex
CREATE INDEX "Transaction_userId_date_idx" ON "Transaction"("userId", "date");

-- CreateIndex
CREATE INDEX "Transaction_userId_categoryId_date_idx" ON "Transaction"("userId", "categoryId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_recurringRuleId_date_key" ON "Transaction"("recurringRuleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_userId_categoryId_month_key" ON "Budget"("userId", "categoryId", "month");

-- CreateIndex
CREATE INDEX "RecurringRule_active_nextRunAt_idx" ON "RecurringRule"("active", "nextRunAt");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
