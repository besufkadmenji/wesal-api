/**
 * The page a push notification opens, without the language prefix.
 * Mirrors wesal-web/src/components/app/shared/notificationHref.ts; keep
 * the two in step.
 */
export const pushLink = (
  relatedEntityType?: string | null,
  relatedEntityId?: string | null,
): string => {
  switch (relatedEntityType) {
    case 'provider':
      return '/profile';
    case 'category':
      return '/categories';
  }
  if (relatedEntityId) {
    switch (relatedEntityType) {
      case 'contract':
        return `/contracts/${relatedEntityId}`;
      case 'conversation':
        return `/conversations/${relatedEntityId}`;
      case 'listing':
        return `/my-listings/${relatedEntityId}`;
      case 'complaint':
        return `/complaints/${relatedEntityId}`;
    }
  }
  // No page of its own: open the site, where the bell list shows it.
  return '';
};

/**
 * The admin-panel page an admin push opens. Mirrors
 * wesal-admin/src/components/app/shared/notifications/adminNotificationHref.ts.
 */
export const adminPushLink = (
  relatedEntityType?: string | null,
  relatedEntityId?: string | null,
): string => {
  const id = relatedEntityId;
  switch (relatedEntityType) {
    case 'contract':
      return id ? `/contracts/${id}` : '/contracts';
    case 'provider_request':
      return id ? `/providers/requests/${id}` : '/providers/requests';
    case 'user':
      return id ? `/users/${id}` : '/users';
    case 'contact_message':
      return id
        ? `/content/contact-messages/${id}`
        : '/content/contact-messages';
    case 'signed_contract':
      return id ? `/providers/e-contracts/${id}` : '/providers/e-contracts';
    case 'complaint':
      return id ? `/complaints/${id}` : '/complaints';
    case 'badge':
      return '/badges';
    default:
      return '';
  }
};
