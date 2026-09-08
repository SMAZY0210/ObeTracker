const bcrypt = require('bcrypt');
const prisma = require('../prisma');

// ── Faculties ────────────────────────────────────────────────
const getFaculties = async (req, res, next) => {
  try {
    const items = await prisma.faculty.findMany({
      where: { institutionId: req.user.institutionId, deletedAt: null },
      include: { _count: { select: { departments: true } } },
    });
    res.json({ status: 'success', data: items });
  } catch (err) { next(err); }
};

const createFaculty = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const item = await prisma.faculty.create({
      data: { name, code: code.toUpperCase(), institutionId: req.user.institutionId },
    });
    res.status(201).json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

const updateFaculty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const item = await prisma.faculty.update({ where: { id }, data: { name, code: code?.toUpperCase() } });
    res.json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

// These five are hard deletes now, each guarded by a dependency check.
//
// Soft deleting left rows behind that still held their unique code, so creating
// a course with a previously deleted code failed on a raw database constraint,
// and the deleted row stayed invisible with its data attached. Hard deleting
// without a guard would be worse: it would either throw a foreign-key error the
// user cannot act on, or need a cascade that silently destroys student marks.
//
// The guard is the part that makes hard delete safe. Nothing is removed while
// anything depends on it, and the refusal names what is in the way.
const deleteFaculty = async (req, res, next) => {
  try {
    const { id } = req.params;

    const departments = await prisma.department.findMany({
      where: { facultyId: id },
      select: { id: true, code: true, name: true },
    });
    if (departments.length) {
      return res.status(409).json({
        status: 'error',
        error: `Cannot delete: ${departments.length} department(s) belong to this faculty (${departments.map((d) => d.code).join(', ')}). Move or delete them first.`,
      });
    }

    await prisma.faculty.delete({ where: { id } });
    res.json({ status: 'success', data: { message: 'Faculty deleted' } });
  } catch (err) { next(err); }
};

// ── Departments ──────────────────────────────────────────────
const getDepartments = async (req, res, next) => {
  try {
    const items = await prisma.department.findMany({
      where: { institutionId: req.user.institutionId, deletedAt: null },
      include: {
        faculty: { select: { id: true, name: true, code: true } },
        _count: { select: { programs: true } },
      },
    });
    res.json({ status: 'success', data: items });
  } catch (err) { next(err); }
};

const createDepartment = async (req, res, next) => {
  try {
    const { name, code, facultyId } = req.body;
    const item = await prisma.department.create({
      data: { name, code: code.toUpperCase(), facultyId: facultyId || null, institutionId: req.user.institutionId },
    });
    res.status(201).json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, facultyId } = req.body;
    const item = await prisma.department.update({
      where: { id },
      data: { name, code: code?.toUpperCase(), ...(facultyId !== undefined && { facultyId: facultyId || null }) },
    });
    res.json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [programs, sessions, students] = await Promise.all([
      prisma.program.findMany({ where: { departmentId: id }, select: { code: true } }),
      prisma.session.findMany({ where: { departmentId: id }, select: { name: true } }),
      prisma.user.count({ where: { role: 'STUDENT', session: { departmentId: id } } }),
    ]);

    const blockers = [];
    if (programs.length) blockers.push(`${programs.length} program(s): ${programs.map((p) => p.code).join(', ')}`);
    if (sessions.length) blockers.push(`${sessions.length} batch(es): ${sessions.map((x) => x.name).join(', ')}`);
    if (students) blockers.push(`${students} student(s)`);

    if (blockers.length) {
      return res.status(409).json({
        status: 'error',
        error: `Cannot delete: ${blockers.join('; ')} still attached.`,
      });
    }

    await prisma.department.delete({ where: { id } });
    res.json({ status: 'success', data: { message: 'Department deleted' } });
  } catch (err) { next(err); }
};

// ── Programs ─────────────────────────────────────────────────
const getPrograms = async (req, res, next) => {
  try {
    const items = await prisma.program.findMany({
      where: { department: { institutionId: req.user.institutionId }, deletedAt: null },
      include: { department: { select: { name: true, code: true } }, _count: { select: { courses: true } } },
    });
    res.json({ status: 'success', data: items });
  } catch (err) { next(err); }
};

const createProgram = async (req, res, next) => {
  try {
    const { departmentId, name, code } = req.body;
    const item = await prisma.program.create({ data: { departmentId, name, code: code.toUpperCase() } });
    res.status(201).json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

const updateProgram = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code } = req.body;
    const item = await prisma.program.update({ where: { id }, data: { name, code: code?.toUpperCase() } });
    res.json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

const deleteProgram = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [courses, outcomes] = await Promise.all([
      prisma.course.findMany({ where: { programId: id }, select: { code: true } }),
      prisma.programOutcome.count({ where: { programId: id } }),
    ]);

    const blockers = [];
    if (courses.length) blockers.push(`${courses.length} course(s): ${courses.map((c) => c.code).join(', ')}`);
    if (outcomes) blockers.push(`${outcomes} program outcome(s)`);

    if (blockers.length) {
      return res.status(409).json({ status: 'error', error: `Cannot delete: ${blockers.join('; ')} still attached.` });
    }

    await prisma.program.delete({ where: { id } });
    res.json({ status: 'success', data: { message: 'Program deleted' } });
  } catch (err) { next(err); }
};

// ── Sessions ─────────────────────────────────────────────────
const getSessions = async (req, res, next) => {
  try {
    const items = await prisma.session.findMany({
      where: { institutionId: req.user.institutionId },
      orderBy: { startDate: 'desc' },
      include: {
        department: { select: { id: true, name: true, code: true } },
        _count: { select: { students: true } },
      },
    });
    res.json({ status: 'success', data: items });
  } catch (err) { next(err); }
};

const createSession = async (req, res, next) => {
  try {
    const { name, startDate, endDate, departmentId } = req.body;
    const item = await prisma.session.create({
      data: {
        name,
        departmentId: departmentId || null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        institutionId: req.user.institutionId,
      },
    });
    res.status(201).json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

const updateSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, status, departmentId } = req.body;
    const session = await prisma.session.findUnique({ where: { id } });

    let frozenThresholds = session.frozenThresholds;
    // Freeze thresholds on close
    if (status === 'CLOSED' && session.status !== 'CLOSED') {
      // AttainmentThreshold held the L0..L3 band cutoffs and was never read by
      // the engine, which used a hardcoded 60 percent. Freeze that instead, so a
      // closed session records the rule it was actually scored under.
      frozenThresholds = { coThreshold: 60 };
    }

    const item = await prisma.session.update({
      where: { id },
      data: {
        name, status,
        ...(departmentId !== undefined && { departmentId: departmentId || null }),
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        frozenThresholds,
      },
    });
    res.json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

const deleteSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    // Guard: a batch with students attached cannot be deleted.
    const count = await prisma.user.count({ where: { sessionId: id, deletedAt: null } });
    if (count > 0) {
      return res.status(409).json({ status: 'error', error: `Cannot delete: ${count} student(s) still in this batch. Move or remove them first.` });
    }
    await prisma.session.delete({ where: { id } });
    res.json({ status: 'success', data: { message: 'Session deleted' } });
  } catch (err) { next(err); }
};

// ── Courses ──────────────────────────────────────────────────
const getCourses = async (req, res, next) => {
  try {
    const { sessionId, programId } = req.query;
    const items = await prisma.course.findMany({
      where: {
        deletedAt: null,
        ...(sessionId && { sessionId }),
        ...(programId && { programId }),
        program: { department: { institutionId: req.user.institutionId } },
      },
      include: {
        program: { select: { name: true, code: true } },
        session: { select: { name: true } },
        assignments: { include: { faculty: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
    });
    res.json({ status: 'success', data: items });
  } catch (err) { next(err); }
};

const createCourse = async (req, res, next) => {
  try {
    const { programId, sessionId, name, code, creditHours } = req.body;
    const upper = (code || '').toUpperCase().trim();

    if (!upper) return res.status(400).json({ status: 'error', error: 'Course code is required' });

    // The unique constraint is (sessionId, code) with no deletedAt in it, so a
    // soft-deleted course still occupies its code. Creating one with a code that
    // had been deleted failed on the raw database constraint, which surfaced to
    // the user as a Prisma stack trace naming a file path on the server.
    const existing = await prisma.course.findFirst({ where: { sessionId, code: upper } });

    if (existing && !existing.deletedAt) {
      return res.status(409).json({
        status: 'error',
        error: `A course with code "${upper}" already exists in this batch.`,
      });
    }

    if (existing) {
      // Revive. Deleting a course is a soft delete and carries no dependency
      // guard, so the row may still hold enrolments, outcomes and marks.
      // Bringing those back is almost always what was wanted: the usual reason
      // a code is being re-entered is that the course was removed by mistake.
      const [enrolments, outcomes, assessments] = await Promise.all([
        prisma.enrolment.count({ where: { courseId: existing.id } }),
        prisma.courseOutcome.count({ where: { courseId: existing.id, deletedAt: null } }),
        prisma.assessment.count({ where: { courseId: existing.id, deletedAt: null } }),
      ]);

      const revived = await prisma.course.update({
        where: { id: existing.id },
        data: {
          programId, sessionId, name,
          code: upper,
          creditHours: creditHours || existing.creditHours || 3,
          deletedAt: null,
          isActive: true,
        },
      });

      const carried = [];
      if (enrolments) carried.push(`${enrolments} enrolment(s)`);
      if (outcomes) carried.push(`${outcomes} course outcome(s)`);
      if (assessments) carried.push(`${assessments} assessment(s)`);

      return res.status(201).json({
        status: 'success',
        data: revived,
        revived: true,
        note: carried.length
          ? `Restored a previously deleted course with this code, along with ${carried.join(', ')}.`
          : 'Restored a previously deleted course with this code. It had no data attached.',
      });
    }

    const item = await prisma.course.create({
      data: { programId, sessionId, name, code: upper, creditHours: creditHours || 3 },
    });
    res.status(201).json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Renaming into a code held by a deleted course hits the same constraint.
    if (req.body.code) {
      const upper = req.body.code.toUpperCase().trim();
      const cur = await prisma.course.findUnique({ where: { id }, select: { sessionId: true } });
      const clash = cur && await prisma.course.findFirst({
        where: { sessionId: cur.sessionId, code: upper, NOT: { id } },
      });
      if (clash) {
        return res.status(409).json({
          status: 'error',
          error: clash.deletedAt
            ? `Code "${upper}" belongs to a deleted course in this batch. Pick another code, or recreate "${upper}" from Add Course to restore it.`
            : `A course with code "${upper}" already exists in this batch.`,
        });
      }
    }
    const { name, code, creditHours } = req.body;
    const item = await prisma.course.update({ where: { id }, data: { name, code: code?.toUpperCase(), creditHours } });
    res.json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { force } = req.query;

    const [enrolments, assessments, outcomes, marks] = await Promise.all([
      prisma.enrolment.count({ where: { courseId: id } }),
      prisma.assessment.count({ where: { courseId: id } }),
      prisma.courseOutcome.count({ where: { courseId: id } }),
      prisma.mark.count({ where: { assessment: { courseId: id } } }),
    ]);

    // Marks are the line. Everything else can be rebuilt from the syllabus; a
    // semester of student marks cannot, and nothing in the interface would warn
    // that deleting a course was about to take them.
    if (marks) {
      return res.status(409).json({
        status: 'error',
        error: `Cannot delete: ${marks} student mark(s) are recorded against this course. Delete the assessments first if you really mean to discard them.`,
      });
    }

    const attached = [];
    if (enrolments) attached.push(`${enrolments} enrolment(s)`);
    if (assessments) attached.push(`${assessments} assessment(s)`);
    if (outcomes) attached.push(`${outcomes} course outcome(s)`);

    if (attached.length && force !== 'true') {
      return res.status(409).json({
        status: 'error',
        error: `This course has ${attached.join(', ')} attached.`,
        impact: { enrolments, assessments, outcomes, marks: 0 },
        hint: 'No marks are recorded, so this can be deleted. Re-send with ?force=true to remove the course and everything above.',
      });
    }

    // Clear the dependants in one transaction. Ordering matters: mappings and
    // assessment links point at outcomes, which point at the course.
    await prisma.$transaction([
      prisma.coPoMapping.deleteMany({ where: { courseId: id } }),
      prisma.assessmentCO.deleteMany({ where: { assessment: { courseId: id } } }),
      prisma.assessment.deleteMany({ where: { courseId: id } }),
      prisma.coAttainment.deleteMany({ where: { courseId: id } }),
      prisma.poAttainment.deleteMany({ where: { courseId: id } }),
      prisma.courseOutcome.deleteMany({ where: { courseId: id } }),
      prisma.enrolment.deleteMany({ where: { courseId: id } }),
      prisma.courseAssignment.deleteMany({ where: { courseId: id } }),
      prisma.course.delete({ where: { id } }),
    ]);

    res.json({
      status: 'success',
      data: { message: `Course deleted${attached.length ? ', along with ' + attached.join(', ') : ''}` },
    });
  } catch (err) { next(err); }
};

const assignFaculty = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { facultyIds } = req.body; // array of user IDs
    // Replace all assignments
    await prisma.courseAssignment.deleteMany({ where: { courseId: id } });
    if (facultyIds?.length) {
      await prisma.courseAssignment.createMany({
        data: facultyIds.map(facultyId => ({ courseId: id, facultyId })),
        skipDuplicates: true,
      });
    }
    res.json({ status: 'success', data: { message: 'Faculty assigned' } });
  } catch (err) { next(err); }
};

// ── User Management ──────────────────────────────────────────
const getUsers = async (req, res, next) => {
  try {
    const { role, isActive, search, sessionId, batchYear, section, departmentId } = req.query;

    // Any one filter narrows the list, and they combine. Department reaches
    // students through their batch, which is the link that was missing: there
    // was no way to list a department's students at all.
    if (role === 'STUDENT' && !search) {
      const given = [departmentId, sessionId, batchYear, section].filter(Boolean).length;
      if (given < 1) {
        return res.status(400).json({
          status: 'error',
          error: 'Pick a department, a batch or a section, or search by roll number or email.',
          accepts: ['departmentId', 'sessionId', 'batchYear', 'section', 'search'],
        });
      }
    }

    const users = await prisma.user.findMany({
      where: {
        institutionId: req.user.institutionId,
        deletedAt: null,
        ...(role && { role }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        // A student belongs to a department through their batch, so the filter
        // has to reach through the session rather than sitting on the user.
        ...(departmentId && { session: { departmentId } }),
        // Filter students by their batch (session). sessionId is the new,
        // department-safe key. batchYear is kept only as a legacy fallback, and
        // it matches on the batch name rather than slicing digits off the roll
        // number, which assumed a roll format that does not hold here.
        ...(sessionId
          ? { sessionId }
          : batchYear
            ? { session: { name: { contains: String(batchYear), mode: 'insensitive' } } }
            : {}),
        ...(section && { section }),
        ...(search && {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { institutionalId: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      select: {
        id: true, email: true, role: true, firstName: true, lastName: true,
        institutionalId: true, section: true, isActive: true, lastLoginAt: true, createdAt: true,
        sessionId: true,
        session: { select: { id: true, name: true, departmentId: true } },
      },
      orderBy: { institutionalId: 'asc' },
    });
    res.json({ status: 'success', data: users });
  } catch (err) { next(err); }
};

const createUser = async (req, res, next) => {
  try {
    const { email, role, firstName, lastName, institutionalId, section, sessionId, password } = req.body;
    if (!email || !role || !firstName || !lastName) {
      return res.status(400).json({ status: 'error', error: 'email, role, firstName and lastName are required' });
    }
    // Check for duplicate email before attempting insert
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ status: 'error', error: `A user with email ${email} already exists` });
    }
    const tempPassword = password || Math.random().toString(36).slice(-10) + 'A1';
    const passwordHash = await bcrypt.hash(tempPassword, Number(process.env.BCRYPT_COST) || 10);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(), role, firstName, lastName,
        institutionalId: institutionalId || null,
        section: section || null,
        sessionId: sessionId || null,
        passwordHash, institutionId: req.user.institutionId,
      },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    });
    res.status(201).json({ status: 'success', data: { user, tempPassword } });
  } catch (err) { next(err); }
};

const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, institutionalId, section, sessionId, isActive, password } = req.body;
    const data = {};
    if (firstName !== undefined) data.firstName = firstName;
    if (lastName  !== undefined) data.lastName  = lastName;
    if (email     !== undefined) data.email      = email;
    if (institutionalId !== undefined) data.institutionalId = institutionalId;
    if (section   !== undefined) data.section    = section;
    if (sessionId !== undefined) data.sessionId  = sessionId || null;
    if (isActive  !== undefined) data.isActive   = isActive;
    if (password) {
      const bcrypt = require('bcrypt');
      data.passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_COST) || 10);
    }
    const user = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, email: true, role: true, firstName: true, lastName: true, isActive: true, institutionalId: true, section: true },
    });
    res.json({ status: 'success', data: user });
  } catch (err) { next(err); }
};

// ── Thresholds ───────────────────────────────────────────────
const getThresholds = async (req, res, next) => {
  try {
    res.json({ status: 'success', data: { attainmentThreshold: 60, note: 'Binary model: CO/PO attained if ≥ 60% of weighted marks' } });
  } catch (err) { next(err); }
};

const upsertThresholds = async (req, res, next) => {
  try {
    // Binary model: threshold is fixed at 60%. This endpoint is kept for compatibility.
    res.json({ status: 'success', data: { attainmentThreshold: 60 } });
  } catch (err) { next(err); }
};

// ── Program Outcomes (Admin defines POs) ─────────────────────
const getProgramOutcomes = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const items = await prisma.programOutcome.findMany({
      where: { programId, deletedAt: null },
    });
    // Sort numerically: PO1, PO2, ..., PO10, PO11, PO12
    items.sort((a, b) => {
      const numA = parseInt(a.code.replace(/\D+/g, ''), 10);
      const numB = parseInt(b.code.replace(/\D+/g, ''), 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.code.localeCompare(b.code);
    });
    res.json({ status: 'success', data: items });
  } catch (err) { next(err); }
};

const createProgramOutcome = async (req, res, next) => {
  try {
    const { programId } = req.params;
    const { code, title, description } = req.body;
    const item = await prisma.programOutcome.create({ data: { programId, code, title, description } });
    res.status(201).json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

const updateProgramOutcome = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { code, title, description } = req.body;
    const item = await prisma.programOutcome.update({ where: { id }, data: { code, title, description } });
    res.json({ status: 'success', data: item });
  } catch (err) { next(err); }
};

const deleteProgramOutcome = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [mappings, attainments] = await Promise.all([
      prisma.coPoMapping.count({ where: { programOutcomeId: id } }),
      prisma.poAttainment.count({ where: { programOutcomeId: id } }),
    ]);

    const blockers = [];
    if (mappings) blockers.push(`${mappings} CO-PO mapping(s)`);
    if (attainments) blockers.push(`${attainments} attainment record(s)`);

    if (blockers.length) {
      return res.status(409).json({
        status: 'error',
        error: `Cannot delete: ${blockers.join(' and ')} reference this outcome. Remove the mappings first.`,
      });
    }

    await prisma.programOutcome.delete({ where: { id } });
    res.json({ status: 'success', data: { message: 'PO deleted' } });
  } catch (err) { next(err); }
};

// ── Institution-wide Dashboard ────────────────────────────────
const getDashboard = async (req, res, next) => {
  try {
    const institutionId = req.user.institutionId;
    const [deptCount, programCount, courseCount, userCount] = await Promise.all([
      prisma.department.count({ where: { institutionId, deletedAt: null } }),
      prisma.program.count({ where: { department: { institutionId }, deletedAt: null } }),
      prisma.course.count({ where: { program: { department: { institutionId } }, deletedAt: null } }),
      prisma.user.count({ where: { institutionId, isActive: true, deletedAt: null } }),
    ]);
    res.json({ status: 'success', data: { deptCount, programCount, courseCount, userCount } });
  } catch (err) { next(err); }
};

const getAttainmentReport = async (req, res, next) => {
  try {
    const { sessionId, departmentId, studentId } = req.query;
    const institutionId = req.user.institutionId;

    // `program` used to appear twice in this object literal when a department
    // filter was set: once for the institution scope, once for the department
    // scope. The second key silently wins in JS, so picking a department
    // dropped the institutionId check entirely instead of narrowing it.
    const courseWhere = {
      deletedAt: null,
      program: {
        department: { institutionId },
        ...(departmentId && { departmentId }),
      },
      ...(sessionId && { sessionId }),
    };

    const courses = await prisma.course.findMany({
      where: courseWhere,
      include: {
        program: { select: { code: true, name: true } },
        session: { select: { name: true } },
      },
    });
    const courseIds = courses.map(c => c.id);
    if (!courseIds.length) {
      return res.json({ status: 'success', data: { courses: [], coSummary: [], poSummary: [] } });
    }

    // CoAttainment has no course relation — join via courseId lookup separately
    const courseMap = Object.fromEntries(courses.map(c => [c.id, c]));

    const coRaw = await prisma.coAttainment.findMany({
      where: {
        courseId: { in: courseIds },
        ...(studentId && { studentId }),
      },
      include: {
        courseOutcome: { select: { code: true, title: true } },
      },
    });

    const poRaw = await prisma.poAttainment.findMany({
      where: {
        courseId: { in: courseIds },
        ...(studentId && { studentId }),
      },
      include: {
        programOutcome: { select: { code: true, title: true } },
      },
    });

    // Fetch CO-PO mappings to link COs to POs
    const mappings = await prisma.coPoMapping.findMany({
      where: { courseId: { in: courseIds }, correlation: { not: null } },
      select: { courseOutcomeId: true, programOutcomeId: true },
    });
    // Build map: courseOutcomeId -> [programOutcomeId]
    const coToPOs = {};
    mappings.forEach(m => {
      if (!coToPOs[m.courseOutcomeId]) coToPOs[m.courseOutcomeId] = [];
      coToPOs[m.courseOutcomeId].push(m.programOutcomeId);
    });

    const coMap = {};
    coRaw.forEach(r => {
      const course = courseMap[r.courseId] || {};
      const key = r.courseId + '_' + r.courseOutcomeId;
      if (!coMap[key]) coMap[key] = {
        courseCode: course.code || '', courseName: course.name || '',
        coCode: r.courseOutcome.code, coTitle: r.courseOutcome.title,
        courseOutcomeId: r.courseOutcomeId,
        mappedPoIds: coToPOs[r.courseOutcomeId] || [],
        attained: 0, total: 0,
      };
      coMap[key].total++;
      if (r.attained) coMap[key].attained++;
    });

    const poMap = {};
    poRaw.forEach(r => {
      const key = r.programOutcomeId;
      if (!poMap[key]) poMap[key] = {
        poCode: r.programOutcome.code, poTitle: r.programOutcome.title,
        programOutcomeId: r.programOutcomeId,
        attained: 0, total: 0,
      };
      poMap[key].total++;
      if (r.attained) poMap[key].attained++;
    });

    const coSummary = Object.values(coMap).map(v => ({
      ...v,
      attainmentRate: v.total ? +(v.attained / v.total * 100).toFixed(1) : 0,
    }));
    const poSummary = Object.values(poMap).map(v => ({
      ...v,
      attainmentRate: v.total ? +(v.attained / v.total * 100).toFixed(1) : 0,
    }));

    const numSort = (a, b) => {
      const nA = parseInt((a.coCode || a.poCode || '').replace(/\D+/g, ''), 10);
      const nB = parseInt((b.coCode || b.poCode || '').replace(/\D+/g, ''), 10);
      return isNaN(nA) || isNaN(nB) ? 0 : nA - nB;
    };
    coSummary.sort(numSort);
    poSummary.sort(numSort);

    res.json({ status: 'success', data: { courses, coSummary, poSummary } });
  } catch (err) { next(err); }
};

const bulkCreateUsers = async (req, res, next) => {
  try {
    const { users, sessionId } = req.body; // sessionId = the batch the whole file joins (students)
    if (!Array.isArray(users) || !users.length) {
      return res.status(400).json({ status: 'error', error: 'No users provided' });
    }
    const bcrypt = require('bcrypt');
    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (const u of users) {
      try {
        if (!u.firstName || !u.lastName || !u.email || !u.role) {
          results.errors.push({ row: u.email || '?', error: 'Missing required fields' });
          continue;
        }
        // Default password = institutionalId if student, else random
        const defaultPw = u.institutionalId || Math.random().toString(36).slice(-8);
        const passwordHash = await bcrypt.hash(defaultPw, 10);
        const existing = await prisma.user.findFirst({
          where: { email: { equals: u.email.trim(), mode: 'insensitive' } },
        });
        if (existing) {
          // Update rather than skip. Re-uploading a corrected sheet did nothing
          // at all, so a section fixed in the file never reached the system and
          // had to be set by hand for every student.
          //
          // Password and role are never touched: a re-upload should not reset
          // anyone's password or silently change their role.
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              firstName: u.firstName.trim(),
              lastName: u.lastName.trim(),
              institutionalId: u.institutionalId?.trim() || existing.institutionalId,
              section: u.section?.trim() || existing.section,
              ...(u.role.toUpperCase() === 'STUDENT' && sessionId ? { sessionId } : {}),
            },
          });
          results.updated = (results.updated || 0) + 1;
          continue;
        }
        const isStudent = u.role.toUpperCase() === 'STUDENT';
        await prisma.user.create({
          data: {
            institutionId: req.user.institutionId,
            email: u.email.trim().toLowerCase(),
            passwordHash,
            role: u.role.toUpperCase(),
            firstName: u.firstName.trim(),
            lastName: u.lastName.trim(),
            institutionalId: u.institutionalId?.trim() || null,
            section: u.section?.trim() || null,
            sessionId: isStudent ? (sessionId || null) : null,
          },
        });
        results.created++;
      } catch(e) {
        results.errors.push({ row: u.email || '?', error: e.message });
      }
    }
    res.json({ status: 'success', data: results });
  } catch (err) { next(err); }
};

const getStudentAttainmentAdmin = async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { courseId } = req.query;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, firstName: true, lastName: true, institutionalId: true, email: true, section: true },
    });
    if (!student) return res.status(404).json({ status: 'error', error: 'Student not found' });

    const coWhere = { studentId, ...(courseId && { courseId }) };
    const poWhere = { studentId, ...(courseId && { courseId }) };

    const [coAttainments, poAttainments, enrolments] = await Promise.all([
      prisma.coAttainment.findMany({
        where: coWhere,
        include: {
          courseOutcome: { select: { code: true, title: true } },
        },
      }),
      prisma.poAttainment.findMany({
        where: poWhere,
        include: { programOutcome: { select: { code: true, title: true } } },
      }),
      prisma.enrolment.findMany({
        where: { studentId },
        include: { course: { select: { id: true, code: true, name: true } } },
      }),
    ]);

    // Group by course
    const courseMap = {};
    for (const e of enrolments) {
      courseMap[e.course.id] = e.course;
    }

    res.json({ status: 'success', data: { student, coAttainments, poAttainments, courses: Object.values(courseMap) } });
  } catch (err) { next(err); }
};

// ── Enrolments ───────────────────────────────────────────────
const getEnrolments = async (req, res, next) => {
  try {
    const { courseId } = req.query;
    if (!courseId) return res.status(400).json({ status: 'error', error: 'courseId required' });
    const enrolments = await prisma.enrolment.findMany({
      where: { courseId },
      orderBy: { createdAt: 'asc' },
    });
    // Fetch student details separately since Enrolment has no student relation
    const studentIds = enrolments.map(e => e.studentId);
    const students = await prisma.user.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, firstName: true, lastName: true, institutionalId: true, section: true },
    });
    const studentMap = Object.fromEntries(students.map(s => [s.id, s]));
    const data = enrolments.map(e => ({ ...e, student: studentMap[e.studentId] || null }));
    res.json({ status: 'success', data });
  } catch (err) { next(err); }
};

const enrolStudents = async (req, res, next) => {
  try {
    const { courseId, studentIds, sessionId, batchYear, section } = req.body;
    if (!courseId) return res.status(400).json({ status: 'error', error: 'courseId required' });

    // Get course to find programId
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { programId: true, program: { select: { departmentId: true } } },
    });
    if (!course) return res.status(404).json({ status: 'error', error: 'Course not found' });

    let students = [];
    if (studentIds && studentIds.length > 0) {
      // Individual students
      students = await prisma.user.findMany({
        where: { id: { in: studentIds }, role: 'STUDENT', deletedAt: null },
        select: { id: true },
      });
    } else {
      // Batch enrolment. Match on the session (batch) link. Only active
      // students can be enrolled; a dropped student is inactive and skipped.
      // The batch scope is mandatory. With sessionId empty this fell through to
      // { role: STUDENT, isActive: true } plus an optional section, matching
      // every student in the institution. Choosing "Batch 2026, all sections"
      // then enrolled section A of every other batch, because nothing in the
      // query mentioned 2026 at all.
      //
      // With a batch and no section, all sections of that batch are enrolled,
      // which is what "All Sections" was meant to do.
      if (!sessionId && !batchYear) {
        return res.status(400).json({
          status: 'error',
          error: 'Pick a batch. Enrolling without one would match every student in the institution.',
        });
      }

      const where = { role: 'STUDENT', deletedAt: null, isActive: true };
      if (sessionId) {
        where.sessionId = sessionId;
      } else {
        // Match the batch by name rather than slicing digits off the roll
        // number, which assumed rolls for batch 2026 begin "26" when they
        // actually begin "23" or "21".
        const sessions = await prisma.session.findMany({
          where: {
            institutionId: req.user.institutionId,
            name: { contains: String(batchYear), mode: 'insensitive' },
          },
          select: { id: true },
        });
        if (!sessions.length) {
          return res.status(400).json({ status: 'error', error: `No batch matching "${batchYear}" found.` });
        }
        where.sessionId = { in: sessions.map((x) => x.id) };
      }
      if (section) where.section = section;
      students = await prisma.user.findMany({ where, select: { id: true } });
    }

    if (!students.length) return res.status(400).json({ status: 'error', error: 'No students found for the given criteria' });

    // Upsert enrolments (skip already enrolled)
    let enrolled = 0, skipped = 0;
    for (const stu of students) {
      const existing = await prisma.enrolment.findUnique({
        where: { studentId_courseId: { studentId: stu.id, courseId } },
      });
      if (existing) { skipped++; continue; }
      await prisma.enrolment.create({ data: { studentId: stu.id, courseId, programId: course.programId } });
      enrolled++;
    }
    res.json({ status: 'success', data: { enrolled, skipped, total: students.length } });
  } catch (err) { next(err); }
};

const removeEnrolment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.enrolment.delete({ where: { id } });
    res.json({ status: 'success' });
  } catch (err) { next(err); }
};

module.exports = {
  getFaculties, createFaculty, updateFaculty, deleteFaculty,
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  getPrograms, createProgram, updateProgram, deleteProgram,
  getSessions, createSession, updateSession, deleteSession,
  getCourses, createCourse, updateCourse, deleteCourse, assignFaculty,
  getUsers, createUser, updateUser, bulkCreateUsers,
  getEnrolments, enrolStudents, removeEnrolment,
  getThresholds, upsertThresholds,
  getAttainmentReport,
  getStudentAttainmentAdmin,
  getProgramOutcomes, createProgramOutcome, updateProgramOutcome, deleteProgramOutcome,
  getDashboard,
};

