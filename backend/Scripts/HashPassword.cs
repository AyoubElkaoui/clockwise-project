// Quick utility to hash passwords for database
// Run with: dotnet script HashPassword.cs

using System;

class HashPassword
{
    static void Main(string[] args)
    {
        Console.WriteLine("Password Hasher");
        Console.WriteLine("===============\n");

        // Hash common passwords
        string[] passwords = { "admin123", "user123", "manager123" };

        foreach (var password in passwords)
        {
            var hash = BCrypt.Net.BCrypt.HashPassword(password);
            Console.WriteLine($"Password: {password}");
            Console.WriteLine($"Hash: {hash}");
            Console.WriteLine();
        }

        Console.WriteLine("\nCopy the hashes above into your SQL migration!");
    }
}
