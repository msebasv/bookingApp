-- CreateTable
CREATE TABLE "HorarioSala" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salaId" TEXT NOT NULL,
    "dia" INTEGER NOT NULL,
    "aperturaMinuto" INTEGER NOT NULL,
    "cierreMinuto" INTEGER NOT NULL,
    CONSTRAINT "HorarioSala_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "inicio" DATETIME NOT NULL,
    "fin" DATETIME NOT NULL,
    "estado" TEXT NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizadoEn" DATETIME NOT NULL,
    CONSTRAINT "Reserva_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Reserva_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservaOcupacion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservaId" TEXT NOT NULL,
    "salaId" TEXT NOT NULL,
    "instante" DATETIME NOT NULL,
    CONSTRAINT "ReservaOcupacion_reservaId_fkey" FOREIGN KEY ("reservaId") REFERENCES "Reserva" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ReservaOcupacion_salaId_fkey" FOREIGN KEY ("salaId") REFERENCES "Sala" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HorarioSala_salaId_dia_key" ON "HorarioSala"("salaId", "dia");

-- CreateIndex
CREATE UNIQUE INDEX "ReservaOcupacion_salaId_instante_key" ON "ReservaOcupacion"("salaId", "instante");
