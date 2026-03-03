using Microsoft.EntityFrameworkCore;
using MBGroup.Web.Data.Models;

namespace MBGroup.Web.Data.Services;

public class TimbratureService
{
    private readonly ApplicationDbContext _db;

    public TimbratureService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<Timbratura>> GetTodayTimbratureAsync(int employeeId)
    {
        var today = DateTime.Today;
        return await _db.Timbrature
            .Where(t => t.EmployeeId == employeeId && t.DataOra.Date == today)
            .OrderBy(t => t.DataOra)
            .ToListAsync();
    }

    public async Task<List<Timbratura>> GetTimbratureByDateRangeAsync(int employeeId, DateTime from, DateTime to)
    {
        return await _db.Timbrature
            .Where(t => t.EmployeeId == employeeId && t.DataOra.Date >= from.Date && t.DataOra.Date <= to.Date)
            .OrderByDescending(t => t.DataOra)
            .ToListAsync();
    }

    public async Task<Timbratura?> GetLastTimbratura(int employeeId)
    {
        return await _db.Timbrature
            .Where(t => t.EmployeeId == employeeId)
            .OrderByDescending(t => t.DataOra)
            .FirstOrDefaultAsync();
    }

    public async Task<Timbratura> AddTimbratura(int employeeId, Timbratura.TipoTimbratura tipo, string? note = null)
    {
        var timbratura = new Timbratura
        {
            EmployeeId = employeeId,
            DataOra = DateTime.Now,
            Tipo = tipo,
            Note = note
        };
        _db.Timbrature.Add(timbratura);
        await _db.SaveChangesAsync();
        return timbratura;
    }

    public async Task<TimeSpan> GetOreGiornaliereAsync(int employeeId, DateTime? date = null)
    {
        var targetDate = date?.Date ?? DateTime.Today;
        var timbrature = await _db.Timbrature
            .Where(t => t.EmployeeId == employeeId && t.DataOra.Date == targetDate)
            .OrderBy(t => t.DataOra)
            .ToListAsync();

        return CalcolaOrelavorate(timbrature);
    }

    private TimeSpan CalcolaOrelavorate(List<Timbratura> timbrature)
    {
        var total = TimeSpan.Zero;
        DateTime? lastIngresso = null;

        foreach (var t in timbrature)
        {
            if (t.Tipo == Timbratura.TipoTimbratura.Ingresso)
            {
                lastIngresso = t.DataOra;
            }
            else if (t.Tipo == Timbratura.TipoTimbratura.Uscita && lastIngresso.HasValue)
            {
                total += t.DataOra - lastIngresso.Value;
                lastIngresso = null;
            }
        }

        // Se c'è un ingresso aperto, conta fino ad ora
        if (lastIngresso.HasValue)
            total += DateTime.Now - lastIngresso.Value;

        return total;
    }

    public async Task<Dictionary<DateOnly, TimeSpan>> GetRiepilogoSettimanaleAsync(int employeeId)
    {
        var startOfWeek = DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek + 1);
        var endOfWeek = startOfWeek.AddDays(6);

        var timbrature = await _db.Timbrature
            .Where(t => t.EmployeeId == employeeId && t.DataOra.Date >= startOfWeek && t.DataOra.Date <= endOfWeek)
            .OrderBy(t => t.DataOra)
            .ToListAsync();

        var result = new Dictionary<DateOnly, TimeSpan>();
        for (var d = startOfWeek; d <= endOfWeek; d = d.AddDays(1))
        {
            var dayTimbrature = timbrature.Where(t => t.DataOra.Date == d).ToList();
            result[DateOnly.FromDateTime(d)] = CalcolaOrelavorate(dayTimbrature);
        }
        return result;
    }

    public async Task<List<TimbraturaSummary>> GetAllTodayTimbratureAsync()
    {
        var today = DateTime.Today;
        var employees = await _db.Employees.Where(e => e.IsActive).ToListAsync();
        var timbrature = await _db.Timbrature
            .Include(t => t.Employee)
            .Where(t => t.DataOra.Date == today)
            .OrderBy(t => t.DataOra)
            .ToListAsync();

        return employees.Select(e => new TimbraturaSummary
        {
            Employee = e,
            Timbrature = timbrature.Where(t => t.EmployeeId == e.Id).ToList(),
            OreOggi = CalcolaOrelavorate(timbrature.Where(t => t.EmployeeId == e.Id).ToList())
        }).ToList();
    }
}

public class TimbraturaSummary
{
    public Employee Employee { get; set; } = null!;
    public List<Timbratura> Timbrature { get; set; } = new();
    public TimeSpan OreOggi { get; set; }
    public bool IsPresente => Timbrature.Any(t => t.Tipo == Timbratura.TipoTimbratura.Ingresso) &&
                              !Timbrature.Any(t => t.Tipo == Timbratura.TipoTimbratura.Uscita &&
                                             t.DataOra > Timbrature.Where(x => x.Tipo == Timbratura.TipoTimbratura.Ingresso).Max(x => x.DataOra));
}
