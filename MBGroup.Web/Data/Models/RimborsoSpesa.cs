namespace MBGroup.Web.Data.Models;

public class RimborsoSpesa
{
    public int Id { get; set; }
    public int EmployeeId { get; set; }
    public Employee Employee { get; set; } = null!;

    public DateOnly Data { get; set; }
    public decimal Importo { get; set; }
    public CategoriaSpesa Categoria { get; set; } = CategoriaSpesa.Altro;
    public string? Descrizione { get; set; }

    /// <summary>Foto scontrino salvata come base64 JPEG compressa</summary>
    public string? FotoBase64 { get; set; }
    public string? FotoMimeType { get; set; }

    public StatoRimborso Stato { get; set; } = StatoRimborso.Inviato;
    public string? NoteApprovatore { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public int? ProcessedByEmployeeId { get; set; }

    public bool HasFoto => !string.IsNullOrEmpty(FotoBase64);
    public string FotoSrc => HasFoto ? $"data:{FotoMimeType ?? "image/jpeg"};base64,{FotoBase64}" : "";
}

public enum CategoriaSpesa
{
    Trasferta,
    Vitto,
    Alloggio,
    Trasporto,
    Carburante,
    Parcheggio,
    Pedaggi,
    Formazione,
    Rappresentanza,
    Altro
}

public enum StatoRimborso
{
    Bozza,
    Inviato,
    Approvato,
    Rifiutato
}
