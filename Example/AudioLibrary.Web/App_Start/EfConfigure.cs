using System.Data.Entity;
using System.Data.Entity.Infrastructure;
using AudioLibrary.DataContext.Migrations;

namespace AudioLibrary.Web.App_Start
{
    public class EfConfigure
    {
        public static void Initialize(string connectionString)
        {
            Database.DefaultConnectionFactory = new SqlConnectionFactory(connectionString);
            Database.SetInitializer(new MigrateDatabaseToLatestVersion<DataContext.DataContext, Configuration>());
        }
    }
}