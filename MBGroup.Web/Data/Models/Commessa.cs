namespace MBGroup.Web.Data.Models;

public class Commessa
{
    public int Id { get; set; }
    public string Codice { get; set; } = "";
    public string Nome { get; set; } = "";
    public string? Descrizione { get; set; }
    public string Cliente { get; set; } = "";
    public DateTime DataInizio { get; set; }
    public DateTime? DataFine { get; set; }
    public StatoCommessa Stato { get; set; } = StatoCommessa.Attiva;
    public string Settore { get; set; } = "";
    public decimal BudgetOre { get; set; }

    public ICollection<CommessaOre> OreRegistrate { get; set; } = new List<CommessaOre>();

    public decimal TotaleOreRegistrate => OreRegistrate.Sum(o => o.Ore);
    public decimal PercentualeAvanzamento => BudgetOre > 0 ? Math.Min(TotaleOreRegistrate / BudgetOre * 100, 100) : 0;
}

public enum StatoCommessa
{
    Attiva,
    Sospesa,
    Completata,
    Annullata
}
