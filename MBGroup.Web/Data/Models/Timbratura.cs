namespace MBGroup.Web.Data.Models;

public class Timbratura
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;
    public DateTime DataOra { get; set; }
    public TipoTimbratura Tipo { get; set; }
    public string? Note { get; set; }

    public enum TipoTimbratura
    {
        Ingresso,
        Uscita,
        PausaInizio,
        PausaFine
    }
}
