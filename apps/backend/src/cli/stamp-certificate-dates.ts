import { readFileSync } from 'fs';
import { NestFactory } from '@nestjs/core';
import { MaintenanceCliModule } from './maintenance-cli.module';
import {
  StampCertificateDatesUseCase,
  StampRequest,
} from '../certificates/use-cases/stamp-certificate-dates.use-case';

const USAGE = `Uso: npm run cli:stamp-certificate-dates -- <manifiesto.json> [--apply]

  <manifiesto.json>  [{ "certificateId": "<uuid>", "expectedChecksum": "<md5>" }, ...]
  --apply            Escribe los PDFs. Sin esta opción solo simula.`;

function readManifest(path: string): StampRequest[] {
  const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
  const isValid =
    Array.isArray(parsed) &&
    parsed.every(
      (item: Record<string, unknown>) =>
        typeof item?.certificateId === 'string' &&
        typeof item?.expectedChecksum === 'string',
    );
  if (!isValid) {
    throw new Error(`Manifiesto inválido: ${path}\n\n${USAGE}`);
  }
  return parsed as StampRequest[];
}

async function main(): Promise<number> {
  const [manifestPath, ...flags] = process.argv.slice(2);
  if (!manifestPath) {
    console.error(USAGE);
    return 2;
  }
  const dryRun = !flags.includes('--apply');
  const requests = readManifest(manifestPath);

  const app = await NestFactory.createApplicationContext(MaintenanceCliModule, {
    logger: ['error', 'warn'],
  });
  try {
    const outcomes = await app
      .get(StampCertificateDatesUseCase)
      .execute(requests, { dryRun });

    console.log(JSON.stringify(outcomes, null, 2));

    const counts: Record<string, number> = {};
    for (const { status } of outcomes)
      counts[status] = (counts[status] ?? 0) + 1;
    console.error(`${dryRun ? 'SIMULACIÓN' : 'APLICADO'}:`, counts);

    const expected = dryRun ? 'would-stamp' : 'stamped';
    return outcomes.every((o) => o.status === expected) ? 0 : 1;
  } finally {
    await app.close();
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
