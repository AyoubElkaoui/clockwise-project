#!/usr/bin/env dotnet-script
#r "nuget: BCrypt.Net-Next, 4.0.3"

using BCrypt.Net;

var password = "manager123";
var hash = BCrypt.HashPassword(password);
Console.WriteLine(hash);
