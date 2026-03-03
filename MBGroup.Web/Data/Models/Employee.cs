namespace MBGroup.Web.Data.Models;

public class Employee
{
    public int Id { get; set; }
    public string FirstName { get; set; } = "";
    public string LastName { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "Employee"; // Employee | Manager | Admin
    public string Department { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Timbratura> Timbrature { get; set; } = new List<Timbratura>();
    public ICollection<CommessaOre> OreCommesse { get; set; } = new List<CommessaOre>();

    public string FullName => $"{FirstName} {LastName}";
}
