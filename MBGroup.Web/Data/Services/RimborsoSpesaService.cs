using Microsoft.EntityFrameworkCore;
using MBGroup.Web.Data.Models;

namespace MBGroup.Web.Data.Services;

public class RimborsoSpesaService
{
    private readonly ApplicationDbContext _db;

    public RimborsoSpesaService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<List<RimborsoSpesa>> GetByEmployeeAsync(int employeeId, int? year = null, int? month = null)
    {
        var q = _db.RimborsiSpese
            .Where(r => r.EmployeeId == employeeId);

        if (year.HasValue)
            q = q.Where(r => r.Data.Year == year.Value);
        if (month.HasValue)
            q = q.Where(r => r.Data.Month == month.Value);

        return await q.OrderByDescending(r => r.Data).ToListAsync();
    }

    public async Task<List<RimborsoSpesa>> GetAllAsync(StatoRimborso? stato = null)
    {
        var q = _db.RimborsiSpese.Include(r => r.Employee).AsQueryable();
        if (stato.HasValue)
            q = q.Where(r => r.Stato == stato.Value);
        return await q.OrderByDescending(r => r.CreatedAt).ToListAsync();
    }

    public async Task<RimborsoSpesa> CreateAsync(RimborsoSpesa rimborso)
    {
        _db.RimborsiSpese.Add(rimborso);
        await _db.SaveChangesAsync();
        return rimborso;
    }

    public async Task UpdateAsync(RimborsoSpesa rimborso)
    {
        _db.RimborsiSpese.Update(rimborso);
        await _db.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var r = await _db.RimborsiSpese.FindAsync(id);
        if (r != null)
        {
            _db.RimborsiSpese.Remove(r);
            await _db.SaveChangesAsync();
        }
    }

    public async Task ApprovaAsync(int id, int approvatorId, string? note = null)
    {
        var r = await _db.RimborsiSpese.FindAsync(id);
        if (r != null)
        {
            r.Stato = StatoRimborso.Approvato;
            r.NoteApprovatore = note;
            r.ProcessedAt = DateTime.UtcNow;
            r.ProcessedByEmployeeId = approvatorId;
            await _db.SaveChangesAsync();
        }
    }

    public async Task RifiutaAsync(int id, int approvatorId, string? note = null)
    {
        var r = await _db.RimborsiSpese.FindAsync(id);
        if (r != null)
        {
            r.Stato = StatoRimborso.Rifiutato;
            r.NoteApprovatore = note;
            r.ProcessedAt = DateTime.UtcNow;
            r.ProcessedByEmployeeId = approvatorId;
            await _db.SaveChangesAsync();
        }
    }

    public async Task<RiepilogoRimborsi> GetRiepilogoMensileAsync(int employeeId, int year, int month)
    {
        var rimborsi = await GetByEmployeeAsync(employeeId, year, month);
        return new RiepilogoRimborsi
        {
            Totale = rimborsi.Sum(r => r.Importo),
            TotaleApprovato = rimborsi.Where(r => r.Stato == StatoRimborso.Approvato).Sum(r => r.Importo),
            TotaleInAttesa = rimborsi.Where(r => r.Stato == StatoRimborso.Inviato).Sum(r => r.Importo),
            Conteggio = rimborsi.Count,
            PerCategoria = rimborsi
                .GroupBy(r => r.Categoria)
                .ToDictionary(g => g.Key, g => g.Sum(r => r.Importo))
        };
    }
}

public class RiepilogoRimborsi
{
    public decimal Totale { get; set; }
    public decimal TotaleApprovato { get; set; }
    public decimal TotaleInAttesa { get; set; }
    public int Conteggio { get; set; }
    public Dictionary<CategoriaSpesa, decimal> PerCategoria { get; set; } = new();
}
