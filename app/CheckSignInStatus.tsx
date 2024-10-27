import { useSession } from "next-auth/react";

function CheckSignInStatus() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <p>Loading...</p>;
  }

  if (!session || !session.user) {
    return <p>User is not signed in</p>;
  }

  return <p>Signed in as {session.user.email}</p>;
}

export default CheckSignInStatus;
