using AudioLibrary.DataInterface;
using AudioLibrary.Models;
using ServiceStack.OrmLite;

namespace AudioLibrary.DataContext.OrmLiteRepositories
{
    public class TestOrmLiteRepository : OrmLiteRepository<Test>, ITestRepository
    {
        public TestOrmLiteRepository(IDbConnectionFactory dbFactory) : base(dbFactory)
        {
        }
    }
}