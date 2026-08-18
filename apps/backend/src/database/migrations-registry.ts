import { InitialSchema1740000000000 } from './migrations/1740000000000-InitialSchema';
import { Migration1771952849166 } from './migrations/1771952849166-Migration';
import { AddLessonOrder1771952849167 } from './migrations/1771952849167-AddLessonOrder';
import { MoveLessonIsLive1771952849168 } from './migrations/1771952849168-MoveLessonIsLive';
import { Migration1772140261227 } from './migrations/1772140261227-Migration';
import { Migration1772164663311 } from './migrations/1772164663311-Migration';
import { AddEnrollmentsAndProgress1772200000000 } from './migrations/1772200000000-AddEnrollmentsAndProgress';
import { Migration1772577517212 } from './migrations/1772577517212-Migration';
import { AddFkIndexes1772577517213 } from './migrations/1772577517213-AddFkIndexes';
import { Migration1772578665651 } from './migrations/1772578665651-Migration';
import { Migration1772652147495 } from './migrations/1772652147495-Migration';
import { Migration1772656342794 } from './migrations/1772656342794-Migration';
import { Migration1772660199311 } from './migrations/1772660199311-Migration';
import { Migration1773239467816 } from './migrations/1773239467816-Migration';
import { Migration1773240510997 } from './migrations/1773240510997-Migration';
import { Migration1773241694350 } from './migrations/1773241694350-Migration';
import { Migration1773243621356 } from './migrations/1773243621356-Migration';
import { MakeLessonDurationNullable1773500000000 } from './migrations/1773500000000-MakeLessonDurationNullable';
import { AddCourseFeatures1773500100000 } from './migrations/1773500100000-AddCourseFeatures';
import { Migration1774043566376 } from './migrations/1774043566376-Migration';
import { Migration1774364896058 } from './migrations/1774364896058-Migration';
import { Migration1774464520488 } from './migrations/1774464520488-Migration';
import { SplitLessonInheritance1774500000000 } from './migrations/1774500000000-SplitLessonInheritance';
import { ConsolidateTemplateStyles1774600000000 } from './migrations/1774600000000-ConsolidateTemplateStyles';
import { AddCertificateTemplateSnapshot1774700000000 } from './migrations/1774700000000-AddCertificateTemplateSnapshot';
import { AddAssignmentLessons1775754021697 } from './migrations/1775754021697-AddAssignmentLessons';
import { AddAssignmentSubmissions1775761357710 } from './migrations/1775761357710-AddAssignmentSubmissions';
import { AddCertificateUserId1782800000000 } from './migrations/1782800000000-AddCertificateUserId';
import { AddPasswordResetTokens1782900000000 } from './migrations/1782900000000-AddPasswordResetTokens';
import { AddCourseTaxonomy1783000000000 } from './migrations/1783000000000-AddCourseTaxonomy';
import { AddNameChangeRequests1783100000000 } from './migrations/1783100000000-AddNameChangeRequests';
import { AddScheduleEvents1783200000000 } from './migrations/1783200000000-AddScheduleEvents';
import { AddLiveLessonSchedule1783300000000 } from './migrations/1783300000000-AddLiveLessonSchedule';
import { AddPushSubscriptions1783400000000 } from './migrations/1783400000000-AddPushSubscriptions';
import { AddCourseAccessDuration1783500000000 } from './migrations/1783500000000-AddCourseAccessDuration';
import { AddCourseInvitations1783600000000 } from './migrations/1783600000000-AddCourseInvitations';

/**
 * MIGRATIONS — Registro único y ordenado de todas las migraciones.
 *
 * ¿Por qué existe este archivo?
 * Antes, la lista de migraciones vivía solo en data-source.ts (el CLI). Pero
 * los tests E2E también necesitan aplicar EXACTAMENTE las mismas migraciones
 * para construir un esquema idéntico al de producción. Duplicar la lista en
 * dos sitios es una fuente de bugs: al añadir una migración, es fácil
 * actualizar uno y olvidar el otro.
 *
 * Al centralizarla aquí (una sola fuente de verdad), tanto el CLI de TypeORM
 * como la configuración de test la importan. Añadir una migración = tocar un
 * solo archivo.
 *
 * El ORDEN importa: TypeORM las ejecuta en el orden del array (que coincide
 * con el timestamp de cada una).
 */
export const MIGRATIONS = [
  InitialSchema1740000000000,
  Migration1771952849166,
  AddLessonOrder1771952849167,
  MoveLessonIsLive1771952849168,
  Migration1772140261227,
  Migration1772164663311,
  AddEnrollmentsAndProgress1772200000000,
  Migration1772577517212,
  AddFkIndexes1772577517213,
  Migration1772578665651,
  Migration1772652147495,
  Migration1772656342794,
  Migration1772660199311,
  Migration1773239467816,
  Migration1773240510997,
  Migration1773241694350,
  Migration1773243621356,
  MakeLessonDurationNullable1773500000000,
  AddCourseFeatures1773500100000,
  Migration1774043566376,
  Migration1774364896058,
  Migration1774464520488,
  SplitLessonInheritance1774500000000,
  ConsolidateTemplateStyles1774600000000,
  AddCertificateTemplateSnapshot1774700000000,
  AddAssignmentLessons1775754021697,
  AddAssignmentSubmissions1775761357710,
  AddCertificateUserId1782800000000,
  AddPasswordResetTokens1782900000000,
  AddCourseTaxonomy1783000000000,
  AddNameChangeRequests1783100000000,
  AddScheduleEvents1783200000000,
  AddLiveLessonSchedule1783300000000,
  AddPushSubscriptions1783400000000,
  AddCourseAccessDuration1783500000000,
  AddCourseInvitations1783600000000,
];
