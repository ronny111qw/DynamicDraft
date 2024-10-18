// pages/api/auth/[...nextauth].js
import { Session } from "inspector/promises";
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
    providers: [
       
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }),
    ],

    session: {
        jwt: true,
        maxAge: 1 * 60,

    },
    callbacks: {
        async redirect({ url, baseUrl }) {
            // Redirect to the desired page after sign-in
            return baseUrl + '/dashboard'; // Change '/dashboard' to your desired path
        },
    },
    secret: process.env.NEXTAUTH_SECRET, // Add the secret here
};

export const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
