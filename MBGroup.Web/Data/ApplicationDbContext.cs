using Microsoft.EntityFrameworkCore;
using MBGroup.Web.Data.Models;

namespace MBGroup.Web.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<Timbratura> Timbrature => Set<Timbratura>();
    public DbSet<Commessa> Commesse => Set<Commessa>();
    public DbSet<CommessaOre> CommesseOre => Set<CommessaOre>();
    public DbSet<RimborsoSpesa> RimborsiSpese => Set<RimborsoSpesa>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Timbratura>()
            .HasOne(t => t.Employee)
            .WithMany(e => e.Timbrature)
            .HasForeignKey(t => t.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CommessaOre>()
            .HasOne(o => o.Employee)
            .WithMany(e => e.OreCommesse)
            .HasForeignKey(o => o.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CommessaOre>()
            .HasOne(o => o.Commessa)
            .WithMany(c => c.OreRegistrate)
            .HasForeignKey(o => o.CommessaId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CommessaOre>()
            .Property(o => o.Ore)
            .HasPrecision(5, 2);

        modelBuilder.Entity<Commessa>()
            .Property(c => c.BudgetOre)
            .HasPrecision(8, 2);

        modelBuilder.Entity<RimborsoSpesa>()
            .HasOne(r => r.Employee)
            .WithMany()
            .HasForeignKey(r => r.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RimborsoSpesa>()
            .Property(r => r.Importo)
            .HasPrecision(10, 2);

        // Seed data
        modelBuilder.Entity<Employee>().HasData(
            new Employee
            {
                Id = 1,
                FirstName = "Mario",
                LastName = "Rossi",
                Email = "mario.rossi@mb-group.it",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password1!"),
                Role = "Admin",
                Department = "IT",
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1)
            },
            new Employee
            {
                Id = 2,
                FirstName = "Laura",
                LastName = "Bianchi",
                Email = "laura.bianchi@mb-group.it",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password1!"),
                Role = "Manager",
                Department = "Engineering",
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1)
            },
            new Employee
            {
                Id = 3,
                FirstName = "Luca",
                LastName = "Verdi",
                Email = "luca.verdi@mb-group.it",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Password1!"),
                Role = "Employee",
                Department = "Engineering",
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1)
            }
        );

        modelBuilder.Entity<Commessa>().HasData(
            new Commessa
            {
                Id = 1,
                Codice = "MB-2024-001",
                Nome = "Impianto Biogas Emilia",
                Descrizione = "Progettazione e installazione impianto biogas 1MW",
                Cliente = "Agrienergia Srl",
                DataInizio = new DateTime(2024, 1, 15),
                DataFine = new DateTime(2024, 12, 31),
                Stato = StatoCommessa.Attiva,
                Settore = "Biogas",
                BudgetOre = 1200
            },
            new Commessa
            {
                Id = 2,
                Codice = "MB-2024-002",
                Nome = "Revamping Raffineria Adriatica",
                Descrizione = "Studio di revamping e ottimizzazione processo",
                Cliente = "Adriatic Refining SpA",
                DataInizio = new DateTime(2024, 3, 1),
                Stato = StatoCommessa.Attiva,
                Settore = "Oil & Gas",
                BudgetOre = 800
            },
            new Commessa
            {
                Id = 3,
                Codice = "MB-2024-003",
                Nome = "Parco Fotovoltaico Nord",
                Descrizione = "Engineering per parco fotovoltaico 50MW",
                Cliente = "SunPower Italia",
                DataInizio = new DateTime(2024, 2, 1),
                DataFine = new DateTime(2024, 8, 31),
                Stato = StatoCommessa.Completata,
                Settore = "Renewable Energy",
                BudgetOre = 600
            }
        );
    }
}
