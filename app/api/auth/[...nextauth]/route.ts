import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";


export const authOptions = {
    providers: [
        GithubProvider({
            clientId: 'Ov23liM1nPwSnHlkDnTc',
            clientSecret:'9d97936b31ae4935ab0c5b444da205d036a78376',
        })
    ]
} 

export const handler = NextAuth(authOptions);
export {handler as GET, handler as POST}