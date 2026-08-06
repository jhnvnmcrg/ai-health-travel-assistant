export default {
  providers: [
    {
      // Set with: npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<your-clerk-domain>
      // It is the "Issuer" of the Clerk JWT template named "convex".
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
