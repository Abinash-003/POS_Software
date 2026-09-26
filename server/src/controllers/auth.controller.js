import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { asText, asEnum, asBool } from "../utils/parse.js";
import { User, USER_ROLES } from "../models/User.js";
import { signToken, setAuthCookie, clearAuthCookie } from "../middleware/auth.js";

async function assertSingleAdmin({ excludingId = null } = {}) {
  const filter = { role: "admin", active: true };
  if (excludingId) filter._id = { $ne: excludingId };
  const count = await User.countDocuments(filter);
  if (count >= 1) throw ApiError.conflict("onlyOneAdmin");
}

export const login = asyncHandler(async (req, res) => {
  const username = asText(req.body.username).toLowerCase();
  const password = asText(req.body.password);

  if (!username || !password) throw ApiError.badRequest("required");

  const user = await User.findOne({ username }).select("+passwordHash");
  if (!user || !user.active) throw ApiError.unauthorized("invalidLogin");

  const valid = await user.verifyPassword(password);
  if (!valid) throw ApiError.unauthorized("invalidLogin");

  user.lastLoginAt = new Date();
  await user.save();

  const token = signToken(user);
  setAuthCookie(res, token);

  res.json({ user: user.toPublic(), token });
});

export const logout = asyncHandler(async (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user.toPublic() });
});

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: 1 });
  res.json({ users: users.map((user) => user.toPublic()) });
});

export const createUser = asyncHandler(async (req, res) => {
  const username = asText(req.body.username).toLowerCase();
  const password = asText(req.body.password);
  const name = asText(req.body.name);
  const role = asEnum(req.body.role, USER_ROLES, "staff");

  if (username.length < 3 || password.length < 5) throw ApiError.badRequest("weakCredentials");

  if (role === "admin") await assertSingleAdmin();

  const exists = await User.findOne({ username });
  if (exists) throw ApiError.conflict("duplicateUsername");

  const passwordHash = await User.hashPassword(password);
  const user = await User.create({ username, passwordHash, name, role });

  res.status(201).json({ user: user.toPublic() });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("userNotFound");

  const isSelf = user._id.equals(req.user._id);

  if (req.body.name !== undefined) user.name = asText(req.body.name);

  // Username changes are admin-only (this route is already admin-gated).
  if (req.body.username !== undefined) {
    const username = asText(req.body.username).toLowerCase();
    if (username.length < 3) throw ApiError.badRequest("weakCredentials");
    const clash = await User.findOne({ username, _id: { $ne: user._id } });
    if (clash) throw ApiError.conflict("duplicateUsername");
    user.username = username;
  }

  if (req.body.role !== undefined && !isSelf) {
    const nextRole = asEnum(req.body.role, USER_ROLES, user.role);
    if (nextRole === "admin" && user.role !== "admin") {
      await assertSingleAdmin({ excludingId: user._id });
    }
    if (user.role === "admin" && nextRole !== "admin") {
      const adminCount = await User.countDocuments({ role: "admin", active: true });
      if (adminCount <= 1) throw ApiError.badRequest("lastAdmin");
    }
    user.role = nextRole;
  }

  if (req.body.active !== undefined && !isSelf) {
    const nextActive = asBool(req.body.active, user.active);
    if (user.role === "admin" && user.active && !nextActive) {
      const adminCount = await User.countDocuments({ role: "admin", active: true });
      if (adminCount <= 1) throw ApiError.badRequest("lastAdmin");
    }
    user.active = nextActive;
  }

  // Password changes are admin-only (this route is already admin-gated).
  if (req.body.password) {
    const password = asText(req.body.password);
    if (password.length < 5) throw ApiError.badRequest("weakCredentials");
    user.passwordHash = await User.hashPassword(password);
  }

  await user.save();
  res.json({ user: user.toPublic() });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    throw ApiError.badRequest("cannotDeleteSelf");
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("userNotFound");

  const adminCount = await User.countDocuments({ role: "admin", active: true });
  if (user.role === "admin" && adminCount <= 1) throw ApiError.badRequest("lastAdmin");

  await user.deleteOne();
  res.json({ ok: true });
});
