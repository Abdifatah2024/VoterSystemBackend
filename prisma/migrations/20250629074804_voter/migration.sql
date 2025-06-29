-- CreateTable
CREATE TABLE "Voter" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "hasVoterId" BOOLEAN NOT NULL DEFAULT false,
    "registeredPlace" TEXT,
    "wantsToChangeRegistration" BOOLEAN,
    "newRegistrationPlace" TEXT,
    "desiredRegistrationPlace" TEXT,
    "clanTitle" TEXT NOT NULL,
    "clanSubtitle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voter_pkey" PRIMARY KEY ("id")
);
