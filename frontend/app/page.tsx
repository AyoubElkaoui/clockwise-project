"use client"
import { useEffect, useState } from "react";
import axios from "axios";

const Home = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:5203/api/users")
        .then(response => setUsers(response.data))
        .catch(error => console.error(error));
  }, []);

  return (
      <div>
        <h1>Gebruikers</h1>
        <ul>
          {users.map((user: any) => (
              <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      </div>
  );
};

export default Home;
