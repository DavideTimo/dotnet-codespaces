using Microsoft.EntityFrameworkCore;
using MBGroup.Web.Data.Models;

namespace MBGroup.Web.Data.Services;

public class AuthService
{
    private readonly ApplicationDbContext _db;
    private Employee? _currentEmployee;

    public AuthService(ApplicationDbContext db)
    {
        _db = db;
    }

    public Employee? CurrentEmployee => _currentEmployee;
    public bool IsAuthenticated => _currentEmployee != null;

    public event Action? OnAuthStateChanged;

    public async Task<bool> LoginAsync(string email, string password)
    {
        var employee = await _db.Employees
            .FirstOrDefaultAsync(e => e.Email == email && e.IsActive);

        if (employee == null) return false;

        if (!BCrypt.Net.BCrypt.Verify(password, employee.PasswordHash)) return false;

        _currentEmployee = employee;
        OnAuthStateChanged?.Invoke();
        return true;
    }

    public void Logout()
    {
        _currentEmployee = null;
        OnAuthStateChanged?.Invoke();
    }

    public bool IsInRole(string role) =>
        _currentEmployee?.Role == role ||
        (role == "Employee" && _currentEmployee != null);

    public bool IsAdmin => _currentEmployee?.Role == "Admin";
    public bool IsManager => _currentEmployee?.Role is "Admin" or "Manager";
}
