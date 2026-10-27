/**
 * ClickUp 869fmmfge: the same rule the web applies at sign-up, now also
 * enforced when a password is changed or reset: 8+ characters with upper and
 * lower case letters, a number and a special character (@$!%*?&). Other
 * characters are allowed, as on the web.
 */
export const PASSWORD_STRENGTH =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
