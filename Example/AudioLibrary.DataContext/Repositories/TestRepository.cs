using AudioLibrary.DataInterface;
using AudioLibrary.Models;

namespace AudioLibrary.DataContext.Repositories
{
    public class TestRepository : Repository<Test>, ITestRepository
    {
        public TestRepository(IUnitOfWork unitOfWork) : base(unitOfWork)
        {
        }
    }
}