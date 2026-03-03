namespace MBGroup.Web.Data.Models;

public class CommessaOre
{
    public int Id { get; set; }
    public int CommessaId { get; set; }
    public Commessa Commessa { get; set; } = null!;
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public DateOnly Data { get; set; }
    public decimal Ore { get; set; }
    public string? Descrizione { get; set; }
    public TipoAttivita TipoAttivita { get; set; } = TipoAttivita.Ordinario;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public enum TipoAttivita
{
    Ordinario,
    Straordinario,
    Trasferta,
    Formazione,
    Riunione
}
