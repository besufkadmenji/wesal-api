export type PushCredentials = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

/**
 * Firebase service-account values for FCM. Push is off (every send is a
 * no-op) unless all three are set, so local development needs nothing.
 */
export const readPushCredentials = (
  env: NodeJS.ProcessEnv = process.env,
): PushCredentials | null => {
  const projectId = env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = env.FIREBASE_CLIENT_EMAIL?.trim();
  // Hosting panels store the key on one line with literal "\n".
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
};
