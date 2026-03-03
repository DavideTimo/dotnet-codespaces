using Microsoft.EntityFrameworkCore;
using MBGroup.Web.Data.Models;

namespace MBGroup.Web.Data.Services;

public class CommesseService
{
    private readonly ApplicationDbContext _db;

    public CommesseService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<Commessa>> GetCommesseAttiveAsync()
    {
        return await _db.Commesse
            .Include(c => c.OreRegistrate)
            .Where(c => c.Stato == StatoCommessa.Attiva)
            .OrderBy(c => c.Codice)
            .ToListAsync();
    }

    public async Task<List<Commessa>> GetAllCommesseAsync()
    {
        return await _db.Commesse
            .Include(c => c.OreRegistrate)
            .OrderByDescending(c => c.DataInizio)
            .ToListAsync();
    }

    public async Task<List<CommessaOre>> GetOreByEmployeeAsync(int employeeId, DateOnly? from = null, DateOnly? to = null)
    {
        var query = _db.CommesseOre
            .Include(o => o.Commessa)
            .Where(o => o.EmployeeId == employeeId);

        if (from.HasValue) query = query.Where(o => o.Data >= from.Value);
        if (to.HasValue) query = query.Where(o => o.Data <= to.Value);

        return await query.OrderByDescending(o => o.Data).ToListAsync();
    }

    public async Task<List<CommessaOre>> GetOreByCommessaAsync(int commessaId)
    {
        return await _db.CommesseOre
            .Include(o => o.Employee)
            .Where(o => o.CommessaId == commessaId)
            .OrderByDescending(o => o.Data)
            .ToListAsync();
    }

    public async Task<CommessaOre> AddOreAsync(CommessaOre ore)
    {
        _db.CommesseOre.Add(ore);
        await _db.SaveChangesAsync();
        return ore;
    }

    public async Task UpdateOreAsync(CommessaOre ore)
    {
        ore.UpdatedAt = DateTime.UtcNow;
        _db.CommesseOre.Update(ore);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteOreAsync(int id)
    {
        var ore = await _db.CommesseOre.FindAsync(id);
        if (ore != null)
        {
            _db.CommesseOre.Remove(ore);
            await _db.SaveChangesAsync();
        }
    }

    public async Task<Dictionary<string, decimal>> GetRiepilogoOreSettimanaAsync(int employeeId)
    {
        var startOfWeek = DateOnly.FromDateTime(DateTime.Today.AddDays(-(int)DateTime.Today.DayOfWeek + 1));
        var endOfWeek = startOfWeek.AddDays(6);

        var ore = await _db.CommesseOre
            .Include(o => o.Commessa)
            .Where(o => o.EmployeeId == employeeId && o.Data >= startOfWeek && o.Data <= endOfWeek)
            .ToListAsync();

        return ore.GroupBy(o => o.Commessa.Codice + " - " + o.Commessa.Nome)
                  .ToDictionary(g => g.Key, g => g.Sum(o => o.Ore));
    }

    public async Task<Commessa?> GetCommessaAsync(int id)
    {
        return await _db.Commesse
            .Include(c => c.OreRegistrate)
            .ThenInclude(o => o.Employee)
            .FirstOrDefaultAsync(c => c.Id == id);
    }

    public async Task<Commessa> CreateCommessaAsync(Commessa commessa)
    {
        _db.Commesse.Add(commessa);
        await _db.SaveChangesAsync();
        return commessa;
    }

    public async Task UpdateCommessaAsync(Commessa commessa)
    {
        _db.Commesse.Update(commessa);
        await _db.SaveChangesAsync();
    }
}
